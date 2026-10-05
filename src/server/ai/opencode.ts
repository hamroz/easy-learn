import { cliEnv, runCli } from "./spawn";
import {
  type AIProvider,
  classifyError,
  type CompleteRequest,
  GENERATION_TIMEOUT_MS,
  type ModelInfo,
  ProviderError,
  type ProviderHealth,
  withSignInHint,
} from "./types";

type OpenCodeEvent = { type?: string; part?: { type?: string; text?: string }; error?: { name?: string; data?: { message?: string } } };

/** Parse `opencode run --format json` events: all text parts in order, or the first error. */
export function parseOpenCodeEvents(lines: string[]): { text?: string; error?: ProviderError } {
  let text = "";
  let sawText = false;
  for (const line of lines) {
    let ev: OpenCodeEvent;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.type === "text" && ev.part?.type === "text" && typeof ev.part.text === "string") {
      text += ev.part.text;
      sawText = true;
    } else if (ev.type === "error") {
      const message = ev.error?.data?.message ?? ev.error?.name ?? "OpenCode reported an error";
      if (!sawText) return { error: classifyError(message) };
    }
  }
  return sawText ? { text } : {};
}

/** Parse `opencode models --verbose`: an id line followed by a JSON object per model. */
export function parseOpenCodeModels(output: string): ModelInfo[] {
  const chunks = output.split(/^(?=[a-z0-9][a-z0-9.-]*\/\S+\n\{)/m).filter((c) => c.trim());
  const out: ModelInfo[] = [];
  for (const chunk of chunks) {
    const nl = chunk.indexOf("\n");
    const id = chunk.slice(0, nl).trim();
    try {
      const d = JSON.parse(chunk.slice(nl + 1)) as {
        name?: string;
        status?: string;
        cost?: { input?: number; output?: number };
        variants?: Record<string, unknown>;
        capabilities?: { output?: { text?: boolean } };
      };
      if (d.status === "deprecated") continue;
      const price = d.cost && typeof d.cost.input === "number" ? `$${d.cost.input}/$${d.cost.output ?? "?"} per M tokens` : undefined;
      out.push({ id, name: d.name ?? id, efforts: Object.keys(d.variants ?? {}), note: price });
    } catch {
      out.push({ id, name: id, efforts: [] });
    }
  }
  return out;
}

const SIGN_IN = "sign in with `opencode providers login` (Docker: `docker compose exec -it web opencode providers login`)";

/** Inline agent: the system prompt, and every tool switched off. */
function agentConfig(system: string) {
  return JSON.stringify({
    agent: { easylearn: { mode: "primary", prompt: system, tools: { "*": false }, permission: { edit: "deny", bash: "deny", webfetch: "deny" } } },
  });
}

export class OpenCodeCliProvider implements AIProvider {
  readonly id = "opencode-cli" as const;
  constructor(private readonly bin = process.env.OPENCODE_BIN || "opencode") {}

  async complete(req: CompleteRequest): Promise<string> {
    try {
      return await this.run(req);
    } catch (e) {
      throw withSignInHint(e, SIGN_IN);
    }
  }

  private async run(req: CompleteRequest): Promise<string> {
    const args = ["run", "--pure", "--format", "json", "--agent", "easylearn"];
    if (req.model) args.push("-m", req.model);
    if (req.effort) args.push("--variant", req.effort);
    const result = await runCli({
      cmd: this.bin,
      args,
      stdin: req.prompt,
      env: { ...cliEnv(), OPENCODE_CONFIG_CONTENT: agentConfig(req.system) },
      timeoutMs: req.timeoutMs ?? GENERATION_TIMEOUT_MS,
      signal: req.signal,
    });
    const parsed = parseOpenCodeEvents(result.lines);
    if (parsed.error) throw parsed.error;
    if (parsed.text !== undefined) {
      req.onDelta?.(parsed.text);
      return parsed.text;
    }
    throw classifyError(result.stderr.trim() || `opencode exited with code ${result.code} and no answer`);
  }

  async listModels(): Promise<ModelInfo[]> {
    const r = await runCli({ cmd: this.bin, args: ["models", "--verbose"], timeoutMs: 60_000 });
    return parseOpenCodeModels(r.lines.join("\n"));
  }

  async health(): Promise<ProviderHealth> {
    try {
      const r = await runCli({ cmd: this.bin, args: ["providers", "list"], timeoutMs: 20_000 });
      const out = `${r.lines.join("\n")}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
      const n = Number(out.match(/(\d+)\s+credentials?/)?.[1] ?? 0);
      if (n > 0) return { ok: true, message: `${n} provider${n > 1 ? "s" : ""} signed in` };
      return { ok: false, message: "OpenCode has no providers signed in", fix: SIGN_IN };
    } catch (e) {
      const err = e as ProviderError;
      return { ok: false, message: err.message, fix: err.kind === "missing" ? "Install OpenCode (npm i -g opencode-ai)" : SIGN_IN };
    }
  }
}
