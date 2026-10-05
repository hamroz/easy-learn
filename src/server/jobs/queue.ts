import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { type Job, jobs } from "@/server/db/schema";

export type JobType = "outline" | "cover" | "reshape" | "steer" | "lesson_plan" | "section" | "widget";

type Listener = () => void;
const globalForQueue = globalThis as unknown as { __elQueueListeners?: Set<Listener> };
const listeners = (globalForQueue.__elQueueListeners ??= new Set());

/** Lets an in-process runner react to new work immediately instead of waiting for its next poll. */
export function onEnqueue(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function enqueue(
  type: JobType,
  payload: Record<string, unknown>,
  opts: { priority?: number; runAfter?: Date } = {},
): Promise<string> {
  const [row] = await db
    .insert(jobs)
    .values({ type, payload, priority: opts.priority ?? 100, runAfter: opts.runAfter ?? new Date() })
    .returning({ id: jobs.id });
  listeners.forEach((fn) => fn());
  return row.id;
}

/** Atomically claim the next runnable job (queued and due, or running with an expired lease). */
export async function claimNext(leaseMs: number): Promise<Job | null> {
  const rows = await db.execute(sql`
    UPDATE jobs SET status = 'running', attempts = attempts + 1,
      locked_until = now() + (${leaseMs}::int * interval '1 millisecond'), updated_at = now()
    WHERE id = (
      SELECT id FROM jobs
      WHERE (status = 'queued' AND run_after <= now()) OR (status = 'running' AND locked_until < now())
      ORDER BY priority, created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id`);
  const id = (rows as unknown as { id: string }[])[0]?.id;
  if (!id) return null;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
  return job ?? null;
}

export async function complete(id: string) {
  await db.update(jobs).set({ status: "done", lockedUntil: null, error: null }).where(eq(jobs.id, id));
}

/** Record a failure. Returns "retry" if the job was rescheduled, "failed" if it is finished for good. */
export async function fail(job: Job, err: unknown, retryable: boolean): Promise<"retry" | "failed"> {
  const message = err instanceof Error ? err.message : String(err);
  if (retryable && job.attempts < job.maxAttempts) {
    const delayMs = 2 ** job.attempts * 10_000;
    await db
      .update(jobs)
      .set({ status: "queued", lockedUntil: null, error: message, runAfter: new Date(Date.now() + delayMs) })
      .where(eq(jobs.id, job.id));
    return "retry";
  }
  await db.update(jobs).set({ status: "failed", lockedUntil: null, error: message }).where(eq(jobs.id, job.id));
  return "failed";
}
