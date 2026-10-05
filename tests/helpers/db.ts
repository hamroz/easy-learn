import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

/** Truncate every app table. Only ever pointed at the test database. */
export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("_test")) throw new Error("resetDb refuses to run outside a *_test database");
  await db.execute(
    sql`TRUNCATE users, sessions, settings, courses, lessons, sections, block_variants, threads, messages, quizzes, jobs RESTART IDENTITY CASCADE`,
  );
}
