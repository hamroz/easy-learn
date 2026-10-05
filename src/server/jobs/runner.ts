import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { type Job, jobs } from "@/server/db/schema";
import { AIOutputError, ProviderError } from "@/server/ai";
import { handlers } from "./handlers";
import { claimNext, complete, fail, type JobType, onEnqueue, renewLease } from "./queue";

/** Leases are renewed every minute while a job runs, so one slow call never lets another worker steal it. */
const LEASE_MS = 15 * 60_000;
const HEARTBEAT_MS = 60_000;

function isRetryable(err: unknown) {
  if (err instanceof ProviderError) return err.retryable;
  if (err instanceof AIOutputError) return true;
  return true;
}

async function execute(job: Job) {
  const handler = handlers[job.type as JobType];
  if (!handler) {
    await fail(job, new Error(`Unknown job type ${job.type}`), false);
    return;
  }
  const heartbeat = setInterval(() => void renewLease(job.id, LEASE_MS).catch(() => {}), HEARTBEAT_MS);
  heartbeat.unref?.();
  try {
    await handler.run(job);
    await complete(job.id);
  } catch (err) {
    const outcome = await fail(job, err, isRetryable(err));
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[jobs] ${job.type} ${job.id} attempt ${job.attempts} failed (${outcome}): ${message}`);
    if (outcome === "failed") await handler.onFailed?.(job, message).catch((e) => console.error("[jobs] onFailed error", e));
  } finally {
    clearInterval(heartbeat);
  }
}

class Runner {
  private active = 0;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly concurrency: number,
    private readonly pollMs: number,
  ) {}

  async start() {
    // Single-instance app: anything still "running" at boot was orphaned by a restart.
    await db.update(jobs).set({ status: "queued", lockedUntil: null }).where(eq(jobs.status, "running"));
    onEnqueue(() => void this.tick());
    this.timer = setInterval(() => void this.tick(), this.pollMs);
    this.timer.unref?.();
    void this.tick();
  }

  private async tick() {
    while (this.active < this.concurrency) {
      this.active++; // reserve the slot before awaiting, so concurrent ticks cannot overshoot
      let job: Job | null = null;
      try {
        job = await claimNext(LEASE_MS);
      } catch (e) {
        console.error("[jobs] claim failed", e);
      }
      if (!job) {
        this.active--;
        return;
      }
      void execute(job).finally(() => {
        this.active--;
        void this.tick();
      });
    }
  }
}

const g = globalThis as unknown as { __elRunner?: Runner };

/** Start the in-process job runner once per server process. */
export async function startRunner() {
  if (g.__elRunner) return;
  const concurrency = Math.max(1, Number(process.env.AI_CONCURRENCY ?? 2));
  g.__elRunner = new Runner(concurrency, 1500);
  await g.__elRunner.start();
  console.log(`[jobs] runner started (concurrency ${concurrency})`);
}

/** Test helper: run every due job sequentially until the queue is empty. */
export async function runJobsUntilIdle(limit = 200) {
  for (let i = 0; i < limit; i++) {
    const job = await claimNext(LEASE_MS);
    if (!job) return;
    await execute(job);
  }
  throw new Error("runJobsUntilIdle: too many jobs");
}
