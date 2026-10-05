import {
  type AIProvider,
  classifyError,
  type CompleteRequest,
  GENERATION_TIMEOUT_MS,
  type ModelInfo,
  ProviderError,
  type ProviderHealth,
} from "./types";

const BASE = "https://openrouter.ai/api/v1";
const KEY_HINT = "check your OpenRouter key in Settings";

type OpenRouterModel = {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
  architecture?: { output_modalities?: string[] };
};

export function parseOpenRouterModels(json: { data?: OpenRouterModel[] }): ModelInfo[] {
  return (json.data ?? [])
    .filter((m) => (m.architecture?.output_modalities ?? ["text"]).every((o) => o === "text"))
    .map((m) => {
      const per = (v?: string) => (v ? Math.round(Number(v) * 1e6 * 100) / 100 : null);
      const inP = per(m.pricing?.prompt);
      const outP = per(m.pricing?.completion);
      return {
        id: m.id,
        name: m.name ?? m.id,
        efforts: m.supported_parameters?.includes("reasoning") ? ["low", "medium", "high"] : [],
        note: inP === 0 && outP === 0 ? "free" : inP !== null ? `$${inP}/$${outP} per M tokens` : undefined,
      };
    });
}

function errorFrom(status: number | undefined, message: string): ProviderError {
  if (status === 401 || status === 403 || /auth|credential|api key/i.test(message)) return new ProviderError("not_logged_in", `${message} — ${KEY_HINT}`);
  if (status === 402) return new ProviderError("rate_limited", `${message} — your OpenRouter credits may be used up`);
  if (status === 429) return new ProviderError("rate_limited", message);
  return classifyError(message);
}

/** Incremental parser for OpenRouter's OpenAI-compatible SSE stream. */
export function createOpenRouterStreamParser(onDelta?: (text: string) => void) {
  let text = "";
  let error: ProviderError | undefined;
  return {
    push(line: string) {
      if (!line.startsWith("data:")) return;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") return;
      try {
        const ev = JSON.parse(data) as { error?: { message?: string; code?: number }; choices?: { delta?: { content?: string } }[] };
        if (ev.error) {
          error ??= errorFrom(ev.error.code, ev.error.message ?? "OpenRouter error");
          return;
        }
        const d = ev.choices?.[0]?.delta?.content ?? "";
        if (d) {
          text += d;
          onDelta?.(d);
        }
      } catch {
        /* keep-alive or partial line */
      }
    },
    finish(): { text?: string; error?: ProviderError } {
      if (error && !text) return { error };
      return text ? { text } : { error: error ?? new ProviderError("failed", "OpenRouter returned no text") };
    },
  };
}

let modelCache: { at: number; models: ModelInfo[] } | null = null;

export class OpenRouterProvider implements AIProvider {
  readonly id = "openrouter" as const;
  constructor(private readonly apiKey: string | null) {}

  async complete(req: CompleteRequest): Promise<string> {
    if (!this.apiKey) throw new ProviderError("not_logged_in", `No OpenRouter key set — ${KEY_HINT}`);
    if (!req.model) throw new ProviderError("failed", "Choose an OpenRouter model for this task in Settings");
    const timeout = AbortSignal.timeout(req.timeoutMs ?? GENERATION_TIMEOUT_MS);
    const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
    let res: Response;
    try {
      res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        signal,
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json", "x-title": "Easy Learn" },
        body: JSON.stringify({
          model: req.model,
          stream: true,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.prompt },
          ],
          ...(req.effort ? { reasoning: { effort: req.effort, exclude: true } } : {}),
        }),
      });
    } catch (e) {
      if (req.signal?.aborted) throw new ProviderError("aborted", "Request was cancelled");
      if (timeout.aborted) throw new ProviderError("timeout", "OpenRouter did not answer in time");
      throw new ProviderError("failed", `Could not reach OpenRouter: ${(e as Error).message}`);
    }
    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw errorFrom(res.status, body.error?.message ?? `OpenRouter returned ${res.status}`);
    }
    const parser = createOpenRouterStreamParser(req.onDelta);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          parser.push(buffer.slice(0, nl).trim());
          buffer = buffer.slice(nl + 1);
        }
      }
    } catch {
      if (req.signal?.aborted) throw new ProviderError("aborted", "Request was cancelled");
      if (timeout.aborted) throw new ProviderError("timeout", "OpenRouter did not answer in time");
    }
    if (buffer.trim()) parser.push(buffer.trim());
    const out = parser.finish();
    if (out.error) throw out.error;
    return out.text!;
  }

  async listModels(): Promise<ModelInfo[]> {
    if (modelCache && Date.now() - modelCache.at < 3_600_000) return modelCache.models;
    const res = await fetch(`${BASE}/models`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new ProviderError("failed", `OpenRouter models request failed (${res.status})`);
    const models = parseOpenRouterModels((await res.json()) as { data?: OpenRouterModel[] });
    modelCache = { at: Date.now(), models };
    return models;
  }

  async health(): Promise<ProviderHealth> {
    if (!this.apiKey) return { ok: false, message: "No OpenRouter key set", fix: "Paste your key in Settings → Providers" };
    try {
      const res = await fetch(`${BASE}/key`, { headers: { authorization: `Bearer ${this.apiKey}` }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return { ok: false, message: `OpenRouter rejected the key (${res.status})`, fix: "Paste a valid key in Settings → Providers" };
      const d = (await res.json()) as { data?: { label?: string; limit_remaining?: number | null } };
      const left = d.data?.limit_remaining;
      return { ok: true, message: `Key works${typeof left === "number" ? ` · $${left.toFixed(2)} left` : ""}` };
    } catch (e) {
      return { ok: false, message: `Could not reach OpenRouter: ${(e as Error).message}` };
    }
  }
}
