import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { sessions, users } from "@/server/db/schema";
import { authenticate, setupOwner, SetupError } from "@/server/auth/accounts";
import { createSessionToken, revokeToken, userFromToken } from "@/server/auth/session";
import { LoginLimiter } from "@/server/auth/rateLimit";
import { isSameOrigin } from "@/server/auth/origin";
import { resetDb } from "../helpers/db";

beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  process.env.SETUP_TOKEN = "correct-token";
});
afterAll(closeDb);

const owner = { token: "correct-token", email: "Owner@Example.test", password: "a-long-password", name: "Owner" };

describe("setupOwner", () => {
  it("creates the owner with a hashed password and normalised email", async () => {
    const u = await setupOwner(owner);
    expect(u.email).toBe("owner@example.test");
    const [row] = await db.select().from(users);
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("rejects a wrong token", async () => {
    await expect(setupOwner({ ...owner, token: "nope" })).rejects.toBeInstanceOf(SetupError);
  });

  it("rejects when no SETUP_TOKEN is configured", async () => {
    delete process.env.SETUP_TOKEN;
    await expect(setupOwner({ ...owner, token: "" })).rejects.toBeInstanceOf(SetupError);
  });

  it("closes after the first user exists", async () => {
    await setupOwner(owner);
    await expect(setupOwner({ ...owner, email: "second@example.test" })).rejects.toThrow(/already/i);
  });

  it("requires passwords of at least 10 characters", async () => {
    await expect(setupOwner({ ...owner, password: "short" })).rejects.toThrow(/10/);
  });
});

describe("authenticate", () => {
  it("accepts the right password (any email case) and rejects others", async () => {
    await setupOwner(owner);
    expect((await authenticate("OWNER@example.test", "a-long-password"))?.email).toBe("owner@example.test");
    expect(await authenticate("owner@example.test", "wrong-password")).toBeNull();
    expect(await authenticate("nobody@example.test", "a-long-password")).toBeNull();
  });
});

describe("sessions", () => {
  it("stores only a hash of the token, resolves the user, and can be revoked", async () => {
    const u = await setupOwner(owner);
    const { token } = await createSessionToken(u.id);
    const [row] = await db.select().from(sessions);
    expect(row.id).not.toBe(token);
    expect((await userFromToken(token))?.id).toBe(u.id);
    await revokeToken(token);
    expect(await userFromToken(token)).toBeNull();
  });

  it("ignores expired sessions", async () => {
    const u = await setupOwner(owner);
    const { token } = await createSessionToken(u.id, new Date(Date.now() - 1000));
    expect(await userFromToken(token)).toBeNull();
  });
});

describe("LoginLimiter", () => {
  it("blocks after 10 failures within 15 minutes and resets on success", () => {
    let now = 0;
    const l = new LoginLimiter(() => now);
    for (let i = 0; i < 10; i++) l.fail("1.2.3.4");
    expect(l.isLimited("1.2.3.4")).toBe(true);
    expect(l.isLimited("5.6.7.8")).toBe(false);
    now += 15 * 60_000 + 1;
    expect(l.isLimited("1.2.3.4")).toBe(false);
    l.fail("9.9.9.9");
    l.succeed("9.9.9.9");
    expect(l.failures("9.9.9.9")).toBe(0);
  });
});

describe("isSameOrigin", () => {
  it("allows safe methods and same-origin writes, rejects cross-origin and missing Origin on writes", () => {
    process.env.APP_ORIGIN = "https://learn.example.test";
    const req = (method: string, origin?: string) =>
      new Request("https://learn.example.test/api/x", { method, headers: origin ? { origin } : {} });
    expect(isSameOrigin(req("GET"))).toBe(true);
    expect(isSameOrigin(req("POST", "https://learn.example.test"))).toBe(true);
    expect(isSameOrigin(req("POST", "https://evil.test"))).toBe(false);
    expect(isSameOrigin(req("POST"))).toBe(false);
  });
});
