import postgres from "postgres";

/** Start every e2e run from an empty database (the server has already applied migrations). */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgres://easylearn:easylearn@127.0.0.1:5433/easylearn_e2e";
  const sql = postgres(url, { onnotice: () => {} });
  await sql`TRUNCATE users, sessions, settings, courses, lessons, sections, block_variants, threads, messages, quizzes, jobs RESTART IDENTITY CASCADE`;
  await sql.end();
}
