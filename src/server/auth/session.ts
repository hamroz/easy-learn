import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sessions, type User, users } from "@/server/db/schema";

export const SESSION_COOKIE = "el_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSessionToken(userId: string, expiresAt = new Date(Date.now() + SESSION_TTL_MS)) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({ id: digest(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function userFromToken(token: string | undefined | null): Promise<User | null> {
  if (!token) return null;
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, digest(token)), gt(sessions.expiresAt, new Date())));
  return row?.user ?? null;
}

export async function revokeToken(token: string) {
  await db.delete(sessions).where(eq(sessions.id, digest(token)));
}
