import type { ProviderId } from "@/server/db/schema";

export type { ProviderId };

export type AITask =
  | "outline"
  | "reshape"
  | "steer"
  | "lesson_plan"
  | "section"
  | "widget"
  | "cover"
  | "answer"
  | "variant"
  | "quiz"
  | "repair";

export type Effort = "low" | "medium" | "high";

export interface CompleteRequest {
  /** What the call is for: used for logging and by the mock provider. */
  task: AITask;
  system: string;
  prompt: string;
  model?: string | null;
  effort?: Effort;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Receives text as it streams (only providers that stream call it). */
  onDelta?: (text: string) => void;
  /** Small facts the mock provider uses to make plausible output (topic, quote, language…). */
  meta?: Record<string, string | number | undefined>;
}

export interface ProviderHealth {
  ok: boolean;
  message: string;
  /** Command the owner can run to fix it, e.g. a login command. */
  fix?: string;
}

export interface AIProvider {
  id: ProviderId;
  complete(req: CompleteRequest): Promise<string>;
  health(): Promise<ProviderHealth>;
}

export type ProviderErrorKind = "not_logged_in" | "missing" | "timeout" | "rate_limited" | "aborted" | "failed";

export class ProviderError extends Error {
  constructor(
    public readonly kind: ProviderErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }

  /** Errors worth retrying later rather than failing immediately. */
  get retryable() {
    return this.kind === "timeout" || this.kind === "rate_limited" || this.kind === "failed";
  }
}

export const GENERATION_TIMEOUT_MS = 6 * 60_000;
export const INTERACTIVE_TIMEOUT_MS = 2 * 60_000;

/** Classify free-form CLI error text. */
export function classifyError(message: string): ProviderError {
  const m = message.toLowerCase();
  if (/not logged in|please run \/login|login required|unauthori[sz]ed|401|authentication_failed|codex login/.test(m))
    return new ProviderError("not_logged_in", message);
  if (/rate.?limit|usage limit|429|too many requests|quota/.test(m)) return new ProviderError("rate_limited", message);
  return new ProviderError("failed", message);
}
