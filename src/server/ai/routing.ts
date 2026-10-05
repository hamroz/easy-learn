import type { z } from "zod";
import type { ModelRef, TaskKey } from "@/content/ai";
import { decryptSecret } from "@/server/crypto";
import { activePreset, getAiSettings } from "@/server/services/aiSettings";
import { getSettingsRow } from "@/server/services/settings";
import { ClaudeCliProvider } from "./claude";
import { CodexCliProvider } from "./codex";
import { AIOutputError, generateJson } from "./json";
import { MockProvider } from "./mock";
import { OpenCodeCliProvider } from "./opencode";
import { OpenRouterProvider } from "./openrouter";
import { type AIProvider, type CompleteRequest, ProviderError } from "./types";

export async function openRouterKey(userId: string): Promise<string | null> {
  const enc = (await getSettingsRow(userId))?.secrets?.openrouter;
  return enc ? decryptSecret(enc) : null;
}

export async function providerFor(provider: ModelRef["provider"], userId: string): Promise<AIProvider> {
  switch (provider) {
    case "codex-cli":
      return new CodexCliProvider();
    case "opencode-cli":
      return new OpenCodeCliProvider();
    case "openrouter":
      return new OpenRouterProvider(await openRouterKey(userId));
    case "claude-cli":
      return new ClaudeCliProvider();
    case "mock":
      return new MockProvider();
  }
}

const canFallBack = (e: unknown) => (e instanceof ProviderError && e.kind !== "aborted") || e instanceof AIOutputError;

type Bound = { ref: ModelRef; provider: AIProvider };

/** The AI for one task: the active preset's primary model, with one retry on its fallback. */
export async function aiFor(userId: string, task: TaskKey) {
  const route = activePreset(await getAiSettings(userId)).routes[task];
  const bind = async (ref: ModelRef): Promise<Bound> => ({ ref, provider: await providerFor(ref.provider, userId) });
  const primary = await bind(route.primary);
  const fallbackRef = route.fallback;

  const withRef = (ref: ModelRef, req: CompleteRequest): CompleteRequest => ({ ...req, model: ref.model, effort: (ref.effort as CompleteRequest["effort"]) ?? undefined });

  async function attempt<T>(run: (b: Bound) => Promise<T>): Promise<T> {
    try {
      return await run(primary);
    } catch (e) {
      if (!fallbackRef || !canFallBack(e)) throw e;
      console.warn(`[ai] ${task}: ${describe(primary.ref)} failed (${(e as Error).message.slice(0, 160)}); trying ${describe(fallbackRef)}`);
      return run(await bind(fallbackRef));
    }
  }

  return {
    complete: (req: CompleteRequest) => attempt((b) => b.provider.complete(withRef(b.ref, req))),
    json: <T>(schema: z.ZodType<T>, req: CompleteRequest, opts?: { lenient?: (raw: unknown) => T | null }) =>
      attempt((b) => generateJson(b.provider, schema, withRef(b.ref, req), opts)),
    describe: () => describe(primary.ref),
  };
}

export function describe(ref: ModelRef) {
  return [ref.provider.replace(/-cli$/, ""), ref.model ?? "default", ref.effort].filter(Boolean).join(" · ");
}
