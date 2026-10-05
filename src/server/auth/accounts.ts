import { timingSafeEqual } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { db } from "@/server/db/client";
import { settings, type User, users } from "@/server/db/schema";

export class SetupError extends Error {}

const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;
/** Verified against when the email is unknown, so timing does not reveal which emails exist. */
let dummyHash: Promise<string> | undefined;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

function tokenMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hasUsers() {
  const [{ n }] = await db.select({ n: count() }).from(users);
  return n > 0;
}

/** Create the single owner account. Only possible with SETUP_TOKEN and while no user exists. */
export async function setupOwner(input: { token: string; email: string; password: string; name?: string }): Promise<User> {
  const expected = process.env.SETUP_TOKEN;
  if (!expected || !tokenMatches(input.token, expected)) throw new SetupError("Invalid setup token");
  if (await hasUsers()) throw new SetupError("The owner account already exists");
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) throw new SetupError("Enter a valid email address");
  if (input.password.length < 10) throw new SetupError("Use a password of at least 10 characters");

  const passwordHash = await hash(input.password, ARGON);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, name: input.name?.trim() || null })
    .returning();
  await db.insert(settings).values({ userId: user.id }).onConflictDoNothing();
  return user;
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
  if (!user) {
    dummyHash ??= hash("not-a-real-password", ARGON);
    await verify(await dummyHash, password).catch(() => false);
    return null;
  }
  return (await verify(user.passwordHash, password).catch(() => false)) ? user : null;
}
