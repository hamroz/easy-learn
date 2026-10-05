/** Runs once when the Next.js server starts: apply migrations, then start the in-process job runner. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_RUNNER === "1") return;
  const { runMigrations } = await import("./server/db/migrate");
  const { startRunner } = await import("./server/jobs/runner");
  await runMigrations();
  await startRunner();
}
