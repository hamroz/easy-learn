import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { settings, users } from "@/server/db/schema";
import { getAiSettings, saveAiSettings } from "@/server/services/aiSettings";
import { TASKS } from "@/content/ai";
import { resetDb } from "../helpers/db";

let userId: string;
beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  const [u] = await db.insert(users).values({ email: "o@example.test", passwordHash: "x" }).returning();
  userId = u.id;
});
afterAll(closeDb);

describe("AI settings", () => {
  it("defaults to a built-in preset when nothing is stored", async () => {
    const s = await getAiSettings(userId);
    expect(s.activePresetId).toMatch(/^builtin:/);
    expect(s.presets).toEqual([]);
  });

  it("migrates legacy provider/model columns into a working preset", async () => {
    await db.insert(settings).values({ userId, provider: "codex-cli", lessonModel: "gpt-5.5", chatModel: "gpt-6-luna" });
    const s = await getAiSettings(userId);
    const preset = s.presets.find((p) => p.id === s.activePresetId)!;
    expect(preset.routes.writing.primary).toMatchObject({ provider: "codex-cli", model: "gpt-5.5" });
    expect(preset.routes.answer.primary).toMatchObject({ provider: "codex-cli", model: "gpt-6-luna" });
    for (const t of TASKS) expect(preset.routes[t]).toBeTruthy();
  });

  it("saves and reloads presets and the model library", async () => {
    const s = await getAiSettings(userId);
    const route = { primary: { provider: "opencode-cli" as const, model: "opencode/glm-5.3", effort: "high" }, fallback: { provider: "codex-cli" as const, model: null, effort: null } };
    const preset = { id: "p1", name: "Mix", routes: Object.fromEntries(TASKS.map((t) => [t, route])) as never };
    await saveAiSettings(userId, { ...s, presets: [preset], activePresetId: "p1", library: { "opencode-cli": ["opencode/glm-5.3"] } });
    const again = await getAiSettings(userId);
    expect(again.activePresetId).toBe("p1");
    expect(again.presets[0].routes.writing.fallback?.provider).toBe("codex-cli");
    expect(again.library["opencode-cli"]).toEqual(["opencode/glm-5.3"]);
  });

  it("falls back to a built-in preset when the active id no longer exists", async () => {
    await db.insert(settings).values({ userId, ai: { library: {}, presets: [], activePresetId: "gone" } });
    expect((await getAiSettings(userId)).activePresetId).toMatch(/^builtin:/);
  });
});
