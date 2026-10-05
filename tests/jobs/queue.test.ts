import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { jobs } from "@/server/db/schema";
import { claimNext, complete, enqueue, fail } from "@/server/jobs/queue";
import { resetDb } from "../helpers/db";

beforeAll(runMigrations);
beforeEach(resetDb);
afterAll(closeDb);

describe("job queue", () => {
  it("never hands the same job to two concurrent claimers", async () => {
    await enqueue("cover", { courseId: "x" });
    const [a, b] = await Promise.all([claimNext(60_000), claimNext(60_000)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it("claims by priority, then age", async () => {
    await enqueue("cover", { n: 1 }, { priority: 100 });
    await enqueue("cover", { n: 2 }, { priority: 5 });
    expect((await claimNext(60_000))?.payload).toEqual({ n: 2 });
  });

  it("does not claim jobs scheduled for later", async () => {
    await enqueue("cover", {}, { runAfter: new Date(Date.now() + 60_000) });
    expect(await claimNext(60_000)).toBeNull();
  });

  it("reclaims a running job whose lease expired", async () => {
    const id = await enqueue("cover", {});
    await claimNext(60_000);
    expect(await claimNext(60_000)).toBeNull();
    await db.update(jobs).set({ lockedUntil: sql`now() - interval '1 second'` }).where(eq(jobs.id, id));
    const again = await claimNext(60_000);
    expect(again?.id).toBe(id);
    expect(again?.attempts).toBe(2);
  });

  it("retries with backoff, then fails for good after max attempts", async () => {
    const id = await enqueue("cover", {});
    for (let attempt = 1; attempt <= 3; attempt++) {
      await db.update(jobs).set({ runAfter: sql`now()` }).where(eq(jobs.id, id));
      const job = (await claimNext(60_000))!;
      const outcome = await fail(job, new Error(`boom ${attempt}`), true);
      expect(outcome).toBe(attempt < 3 ? "retry" : "failed");
    }
    const [row] = await db.select().from(jobs).where(eq(jobs.id, id));
    expect(row.status).toBe("failed");
    expect(row.error).toContain("boom 3");
  });

  it("fails immediately when the error is not retryable", async () => {
    await enqueue("cover", {});
    const job = (await claimNext(60_000))!;
    expect(await fail(job, new Error("not logged in"), false)).toBe("failed");
  });

  it("marks completed jobs done", async () => {
    const id = await enqueue("cover", {});
    await complete((await claimNext(60_000))!.id);
    const [row] = await db.select().from(jobs).where(eq(jobs.id, id));
    expect(row.status).toBe("done");
  });
});
