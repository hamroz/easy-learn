import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { jobs } from "@/server/db/schema";
import { claimNext, enqueue, renewLease } from "@/server/jobs/queue";
import { resetDb } from "../helpers/db";

beforeAll(runMigrations);
beforeEach(resetDb);
afterAll(closeDb);

describe("renewLease", () => {
  it("pushes a running job's lease forward so it is not reclaimed mid-work", async () => {
    const id = await enqueue("cover", {});
    await claimNext(1_000);
    const [before] = await db.select().from(jobs).where(eq(jobs.id, id));
    await renewLease(id, 10 * 60_000);
    const [after] = await db.select().from(jobs).where(eq(jobs.id, id));
    expect(after.lockedUntil!.getTime()).toBeGreaterThan(before.lockedUntil!.getTime() + 5 * 60_000);
    expect(await claimNext(1_000)).toBeNull();
  });

  it("does nothing for jobs that are no longer running", async () => {
    const id = await enqueue("cover", {});
    await renewLease(id, 60_000);
    const [row] = await db.select().from(jobs).where(eq(jobs.id, id));
    expect(row.status).toBe("queued");
    expect(row.lockedUntil).toBeNull();
  });
});
