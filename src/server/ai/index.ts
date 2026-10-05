import { ClaudeCliProvider } from "./claude";
import { CodexCliProvider } from "./codex";
import { MockProvider } from "./mock";
import type { AIProvider, ProviderId } from "./types";

export const PROVIDER_IDS: ProviderId[] = ["codex-cli", "claude-cli", "mock"];

export function defaultProviderId(): ProviderId {
  const env = process.env.AI_PROVIDER as ProviderId | undefined;
  return env && PROVIDER_IDS.includes(env) ? env : "codex-cli";
}

export function getProvider(id?: ProviderId | null): AIProvider {
  switch (id ?? defaultProviderId()) {
    case "claude-cli":
      return new ClaudeCliProvider();
    case "mock":
      return new MockProvider();
    default:
      return new CodexCliProvider();
  }
}

export * from "./types";
export { generateJson, AIOutputError } from "./json";
