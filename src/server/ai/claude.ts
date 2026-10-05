import { runCli } from "./spawn";
import {
  type AIProvider,
  classifyError,
  type CompleteRequest,
  GENERATION_TIMEOUT_MS,
  ProviderError,
  type ProviderHealth,
  withSignInHint,
} from "./types";

type ClaudeEvent = {
  type?: string;
  event?: { type?: string; delta?: { type?: string; text?: string } };
  error?: string;
  is_error?: boolean;
  result?: string;
  message?: { content?: { type?: string; text?: string }[] };
};

/** Incremental parser for `claude -p --output-format stream-json --include-partial-messages`. */
export function createClaudeStreamParser(onDelta?: (text: string) => void) {
  let streamed = "";
  let result: string | undefined;
  let error: ProviderError | undefined;

  return {
    push(line: string) {
      let ev: ClaudeEvent;
      try {
        ev = JSON.parse(line);
      } catch {
        return;
      }
      if (ev.type === "stream_event" && ev.event?.type === "content_block_delta" && ev.event.delta?.type === "text_delta") {
        const t = ev.event.delta.text ?? "";
        streamed += t;
        if (t) onDelta?.(t);
      } else if (ev.type === "assistant" && ev.error) {
        const text = ev.message?.content?.map((c) => c.text ?? "").join("") || ev.error;
        error =
          ev.error === "authentication_failed"
            ? new ProviderError("not_logged_in", text)
            : ev.error === "rate_limit"
              ? new ProviderError("rate_limited", text)
              : classifyError(text);
      } else if (ev.type === "result") {
        if (ev.is_error) error ??= classifyError(ev.result ?? "Claude returned an error");
        else result = ev.result ?? streamed;
      }
    },
    finish(): { text?: string; error?: ProviderError } {
      if (error) return { error };
      if (result !== undefined) return { text: result };
      if (streamed) return { text: streamed };
      return {};
    },
  };
}

const SIGN_IN = "sign in by running `claude` and typing /login (Docker: `docker compose exec -it web claude`)";

export class ClaudeCliProvider implements AIProvider {
  readonly id = "claude-cli" as const;
  constructor(private readonly bin = process.env.CLAUDE_BIN || "claude") {}

  async complete(req: CompleteRequest): Promise<string> {
    try {
      return await this.run(req);
    } catch (e) {
      throw withSignInHint(e, SIGN_IN);
    }
  }

  private async run(req: CompleteRequest): Promise<string> {
    const args = [
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--tools",
      "",
      "--no-session-persistence",
      "--setting-sources",
      "",
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--system-prompt",
      req.system,
    ];
    if (req.model) args.push("--model", req.model);
    if (req.effort) args.push("--effort", req.effort);

    const parser = createClaudeStreamParser(req.onDelta);
    const result = await runCli({
      cmd: this.bin,
      args,
      stdin: req.prompt,
      timeoutMs: req.timeoutMs ?? GENERATION_TIMEOUT_MS,
      signal: req.signal,
      onLine: (l) => parser.push(l),
    });
    const parsed = parser.finish();
    if (parsed.error) throw parsed.error;
    if (parsed.text !== undefined) return parsed.text;
    throw classifyError(result.stderr.trim() || `claude exited with code ${result.code} and no answer`);
  }

  async health(): Promise<ProviderHealth> {
    const fix = "claude   (then type /login)";
    try {
      const r = await runCli({ cmd: this.bin, args: ["auth", "status"], timeoutMs: 20_000 });
      const status = JSON.parse(r.lines.join("\n") || "{}") as { loggedIn?: boolean; authMethod?: string };
      if (status.loggedIn) return { ok: true, message: `Logged in (${status.authMethod ?? "subscription"})` };
      return { ok: false, message: "Claude is not logged in", fix };
    } catch (e) {
      const err = e as ProviderError;
      return { ok: false, message: err.message, fix: err.kind === "missing" ? "Install Claude Code" : fix };
    }
  }
}
