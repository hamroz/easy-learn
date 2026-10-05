import { runCli } from "./spawn";
import {
  type AIProvider,
  classifyError,
  type CompleteRequest,
  GENERATION_TIMEOUT_MS,
  ProviderError,
  type ModelInfo,
  type ProviderHealth,
  withSignInHint,
} from "./types";

type CodexCatalogEntry = {
  slug?: string;
  display_name?: string;
  visibility?: string;
  default_reasoning_level?: string;
  supported_reasoning_levels?: (string | { effort?: string })[];
};

/** Parse `codex debug models` output; only models Codex itself lists are offered. */
export function parseCodexModels(json: string): ModelInfo[] {
  const parsed = JSON.parse(json) as { models?: CodexCatalogEntry[] } | CodexCatalogEntry[];
  const list = Array.isArray(parsed) ? parsed : (parsed.models ?? []);
  return list
    .filter((m) => m.slug && m.visibility !== "hide")
    .map((m) => ({
      id: m.slug!,
      name: m.display_name ?? m.slug!,
      efforts: (m.supported_reasoning_levels ?? []).map((e) => (typeof e === "string" ? e : (e.effort ?? ""))).filter(Boolean),
      defaultEffort: m.default_reasoning_level ?? null,
    }));
}

/** Pull the human-readable message out of codex's nested JSON error strings. */
function readableMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message ?? parsed?.message ?? raw;
  } catch {
    return raw;
  }
}

/** Parse `codex exec --json` JSONL events into the final agent message or an error. */
export function parseCodexEvents(lines: string[]): { text?: string; error?: ProviderError } {
  let text: string | undefined;
  let errorMessage: string | undefined;
  for (const line of lines) {
    let ev: { type?: string; item?: { type?: string; text?: string }; message?: string; error?: { message?: string } };
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.type === "item.completed" && ev.item?.type === "agent_message" && typeof ev.item.text === "string") {
      text = ev.item.text;
    } else if (ev.type === "turn.failed" && ev.error?.message) {
      errorMessage = readableMessage(ev.error.message);
    } else if (ev.type === "error" && ev.message) {
      errorMessage ??= readableMessage(ev.message);
    }
  }
  if (text !== undefined) return { text };
  if (errorMessage) return { error: classifyError(errorMessage) };
  return {};
}

const SYSTEM_WRAPPER = (system: string, prompt: string) =>
  `<instructions>\n${system}\n\nAnswer directly in your reply. Do not run shell commands, do not read or write files, and do not ask questions.\n</instructions>\n\n${prompt}`;

const SIGN_IN = "sign in with `codex login --device-auth` (Docker: `docker compose exec -it web codex login --device-auth`)";

export class CodexCliProvider implements AIProvider {
  readonly id = "codex-cli" as const;
  constructor(private readonly bin = process.env.CODEX_BIN || "codex") {}

  async complete(req: CompleteRequest): Promise<string> {
    try {
      return await this.run(req);
    } catch (e) {
      throw withSignInHint(e, SIGN_IN);
    }
  }

  private async run(req: CompleteRequest): Promise<string> {
    const args = ["exec", "--json", "--skip-git-repo-check", "--ephemeral", "--ignore-user-config", "--sandbox", "read-only"];
    if (req.model) args.push("-m", req.model);
    if (req.effort) args.push("-c", `model_reasoning_effort="${req.effort}"`);
    args.push("-");

    const result = await runCli({
      cmd: this.bin,
      args,
      stdin: SYSTEM_WRAPPER(req.system, req.prompt),
      timeoutMs: req.timeoutMs ?? GENERATION_TIMEOUT_MS,
      signal: req.signal,
    });
    const parsed = parseCodexEvents(result.lines);
    if (parsed.text !== undefined) {
      req.onDelta?.(parsed.text);
      return parsed.text;
    }
    if (parsed.error) throw parsed.error;
    throw classifyError(result.stderr.trim() || `codex exited with code ${result.code} and no answer`);
  }

  async listModels(): Promise<ModelInfo[]> {
    const r = await runCli({ cmd: this.bin, args: ["debug", "models"], timeoutMs: 30_000 });
    return parseCodexModels(r.lines.join("\n"));
  }

  async health(): Promise<ProviderHealth> {
    const fix = "codex login --device-auth";
    try {
      const r = await runCli({ cmd: this.bin, args: ["login", "status"], timeoutMs: 20_000 });
      const out = `${r.lines.join("\n")}\n${r.stderr}`.trim();
      if (r.code === 0 && /logged in/i.test(out)) return { ok: true, message: out.split("\n")[0] };
      return { ok: false, message: out || "Codex is not logged in", fix };
    } catch (e) {
      const err = e as ProviderError;
      return { ok: false, message: err.message, fix: err.kind === "missing" ? "npm install -g @openai/codex" : fix };
    }
  }
}
