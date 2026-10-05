import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { POST as setup } from "@/app/api/auth/setup/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/me/route";
import { loginLimiter } from "@/server/auth/rateLimit";
import { resetDb } from "../helpers/db";

const ORIGIN = "http://localhost:3000";

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": "10.0.0.1", ...headers },
    body: JSON.stringify(body),
  });
}
const cookieFrom = (res: Response) => res.headers.get("set-cookie")?.split(";")[0] ?? "";

beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  process.env.SETUP_TOKEN = "tok";
  process.env.APP_ORIGIN = ORIGIN;
  loginLimiter.succeed("10.0.0.1");
});
afterAll(closeDb);

const creds = { email: "owner@example.test", password: "a-long-password" };

describe("auth routes", () => {
  it("setup signs the owner in; me returns them; logout clears the session", async () => {
    const res = await setup(post("/api/auth/setup", { token: "tok", ...creds, name: "Owner" }));
    expect(res.status).toBe(200);
    const cookie = cookieFrom(res);
    expect(cookie).toMatch(/^el_session=/);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);

    const meRes = await me(new Request(`${ORIGIN}/api/me`, { headers: { cookie } }));
    expect((await meRes.json()).user.email).toBe(creds.email);

    await logout(post("/api/auth/logout", {}, { cookie }));
    expect((await me(new Request(`${ORIGIN}/api/me`, { headers: { cookie } }))).status).toBe(401);
  });

  it("login sets a cookie for valid credentials and 401s otherwise", async () => {
    await setup(post("/api/auth/setup", { token: "tok", ...creds }));
    expect((await login(post("/api/auth/login", creds))).status).toBe(200);
    expect((await login(post("/api/auth/login", { ...creds, password: "wrong-password" }))).status).toBe(401);
  });

  it("rejects cross-origin writes with 403", async () => {
    const res = await login(post("/api/auth/login", creds, { origin: "https://evil.test" }));
    expect(res.status).toBe(403);
  });

  it("returns 429 after too many failures", async () => {
    await setup(post("/api/auth/setup", { token: "tok", ...creds }));
    for (let i = 0; i < 10; i++) await login(post("/api/auth/login", { ...creds, password: "nope-nope-nope" }));
    expect((await login(post("/api/auth/login", creds))).status).toBe(429);
  });

  it("returns 400 for malformed bodies", async () => {
    expect((await login(post("/api/auth/login", { email: 5 }))).status).toBe(400);
  });
});
