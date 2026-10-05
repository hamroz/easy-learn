import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { settings, users } from "@/server/db/schema";
import { createSessionToken } from "@/server/auth/session";
import { GET as getSettings, PUT as putSettings } from "@/app/api/settings/route";
import { PUT as putKey } from "@/app/api/settings/openrouter-key/route";
import { DELETE as revokeToken, POST as createToken } from "@/app/api/settings/token/route";
import { GET as getModels } from "@/app/api/providers/[id]/models/route";
import { TASKS } from "@/content/ai";
import { resetDb } from "../helpers/db";

const ORIGIN = "http://localhost:3000";
let cookie = "";
let userId = "";
const req = (method: string, path: string, body?: unknown) =>
  new Request(`${ORIGIN}${path}`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN, cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  process.env.APP_ORIGIN = ORIGIN;
  process.env.APP_SECRET = "a-test-secret-that-is-long-enough";
  const [u] = await db.insert(users).values({ email: "o@example.test", passwordHash: "x" }).returning();
  userId = u.id;
  cookie = `el_session=${(await createSessionToken(u.id)).token}`;
});
afterAll(closeDb);

describe("settings API", () => {
  it("stores the OpenRouter key encrypted and never returns it", async () => {
    const res = await putKey(req("PUT", "/api/settings/openrouter-key", { key: "sk-or-v1-0123456789abcdef" }));
    expect(await res.json()).toEqual({ openrouter: { set: true, last4: "cdef" } });
    const [row] = await db.select().from(settings).where(eq(settings.userId, userId));
    expect(JSON.stringify(row.secrets)).not.toContain("0123456789abcdef");
    const body = JSON.stringify(await (await getSettings(req("GET", "/api/settings"))).json());
    expect(body).not.toContain("0123456789");
    expect(body).toContain('"last4":"cdef"');
  });

  it("removes the key", async () => {
    await putKey(req("PUT", "/api/settings/openrouter-key", { key: "sk-or-v1-0123456789abcdef" }));
    const res = await putKey(req("PUT", "/api/settings/openrouter-key", { key: null }));
    expect(await res.json()).toEqual({ openrouter: { set: false, last4: null } });
  });

  it("saves fonts and a valid preset, rejects an invalid one", async () => {
    const route = { primary: { provider: "mock", model: "mock", effort: null }, fallback: null };
    const preset = { id: "p1", name: "Mine", routes: Object.fromEntries(TASKS.map((t) => [t, route])) };
    const ok = await putSettings(req("PUT", "/api/settings", { fonts: ["plex"], ai: { library: {}, presets: [preset], activePresetId: "p1" } }));
    expect(ok.status).toBe(200);
    const s = await (await getSettings(req("GET", "/api/settings"))).json();
    expect(s.fonts).toEqual(["plex"]);
    expect(s.ai.activePresetId).toBe("p1");
    const bad = await putSettings(req("PUT", "/api/settings", { ai: { library: {}, presets: [{ id: "x", name: "x", routes: {} }], activePresetId: "x" } }));
    expect(bad.status).toBe(400);
  });

  it("issues an access token once and stores only its hash; revoking clears it", async () => {
    const { token } = await (await createToken(req("POST", "/api/settings/token", {}))).json();
    expect(token).toMatch(/^el_/);
    const [row] = await db.select().from(settings).where(eq(settings.userId, userId));
    expect(row.authorTokenHash).toBeTruthy();
    expect(row.authorTokenHash).not.toContain(token);
    await revokeToken(req("DELETE", "/api/settings/token"));
    const [after] = await db.select().from(settings).where(eq(settings.userId, userId));
    expect(after.authorTokenHash).toBeNull();
  });

  it("lists a provider's models", async () => {
    const res = await getModels(req("GET", "/api/providers/mock/models"), { params: Promise.resolve({ id: "mock" }) });
    expect((await res.json()).models[0].id).toBe("mock");
    const unknown = await getModels(req("GET", "/api/providers/nope/models"), { params: Promise.resolve({ id: "nope" }) });
    expect(unknown.status).toBe(404);
  });
});
