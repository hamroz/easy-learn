import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { users } from "@/server/db/schema";
import { TASKS, type Preset, type Route } from "@/content/ai";
import { aiFor } from "@/server/ai/routing";
import { MockProvider } from "@/server/ai/mock";
import { ProviderError } from "@/server/ai/types";
import { getAiSettings, saveAiSettings } from "@/server/services/aiSettings";
import { resetDb } from "../helpers/db";

let userId: string;
beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  const [u] = await db.insert(users).values({ email: "o@example.test", passwordHash: "x" }).returning();
  userId = u.id;
});
afterEach(() => vi.restoreAllMocks());
afterAll(closeDb);

async function usePreset(routes: Partial<Record<(typeof TASKS)[number], Route>>) {
  const base: Route = { primary: { provider: "mock", model: "base", effort: null }, fallback: null };
  const preset: Preset = { id: "p", name: "Test", routes: Object.fromEntries(TASKS.map((t) => [t, routes[t] ?? base])) as Preset["routes"] };
  await saveAiSettings(userId, { ...(await getAiSettings(userId)), presets: [preset], activePresetId: "p" });
}

describe("aiFor", () => {
  it("uses the active preset's model and effort for the task", async () => {
    await usePreset({ writing: { primary: { provider: "mock", model: "writer", effort: "high" }, fallback: null } });
    const spy = vi.spyOn(MockProvider.prototype, "complete");
    const ai = await aiFor(userId, "writing");
    await ai.complete({ task: "section", system: "s", prompt: "p", effort: "low" });
    expect(spy.mock.calls[0][0]).toMatchObject({ model: "writer", effort: "high" });
    expect(ai.describe()).toBe("mock · writer · high");
  });

  it("retries once on the fallback after a provider error", async () => {
    await usePreset({ answer: { primary: { provider: "mock", model: "a", effort: null }, fallback: { provider: "mock", model: "b", effort: null } } });
    const original = MockProvider.prototype.complete;
    const spy = vi.spyOn(MockProvider.prototype, "complete").mockImplementation(async function (this: MockProvider, req) {
      if (req.model === "a") throw new ProviderError("rate_limited", "busy");
      return original.call(this, req);
    });
    const text = await (await aiFor(userId, "answer")).complete({ task: "answer", system: "s", prompt: "p", meta: { quote: "q" } });
    expect(text).toContain("q");
    expect(spy.mock.calls.map((c) => c[0].model)).toEqual(["a", "b"]);
  });

  it("falls back when the primary keeps returning invalid JSON", async () => {
    await usePreset({ quiz: { primary: { provider: "mock", model: "a", effort: null }, fallback: { provider: "mock", model: "b", effort: null } } });
    const spy = vi.spyOn(MockProvider.prototype, "complete").mockImplementation(async (req) => (req.model === "a" ? "not json" : '{"ok":true}'));
    const out = await (await aiFor(userId, "quiz")).json(z.object({ ok: z.boolean() }), { task: "quiz", system: "s", prompt: "p" });
    expect(out).toEqual({ ok: true });
    expect(spy.mock.calls.map((c) => c[0].model)).toEqual(["a", "a", "b"]); // primary + its repair, then fallback
  });

  it("does not fall back when the request was cancelled", async () => {
    await usePreset({ answer: { primary: { provider: "mock", model: "a", effort: null }, fallback: { provider: "mock", model: "b", effort: null } } });
    const spy = vi.spyOn(MockProvider.prototype, "complete").mockRejectedValue(new ProviderError("aborted", "cancelled"));
    await expect((await aiFor(userId, "answer")).complete({ task: "answer", system: "s", prompt: "p" })).rejects.toMatchObject({ kind: "aborted" });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("uses a built-in preset by default", async () => {
    const ai = await aiFor(userId, "writing");
    expect(ai.describe()).toMatch(/^mock/);
  });
});
