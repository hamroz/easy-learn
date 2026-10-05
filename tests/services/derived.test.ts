import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, db } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { courses, lessons, users } from "@/server/db/schema";
import { runJobsUntilIdle } from "@/server/jobs/runner";
import { createCourse } from "@/server/services/generation";
import { biteForMapNode, cheatSheetFor, goDeeper } from "@/server/services/derived";
import { resetDb } from "../helpers/db";

let userId: string;
beforeAll(runMigrations);
beforeEach(async () => {
  await resetDb();
  const [u] = await db.insert(users).values({ email: "o@example.test", passwordHash: "x" }).returning();
  userId = u.id;
});
afterAll(closeDb);

async function readyItem(format: "map" | "course" | "bite") {
  const c = await createCourse(userId, { topic: "Atoms", level: "beginner", format });
  await runJobsUntilIdle();
  const [lesson] = await db.select().from(lessons).where(eq(lessons.courseId, c.id));
  return { courseId: c.id, lessonId: lesson.id };
}

describe("derived items", () => {
  it("a map node opens a quick bite linked to the map, reused on the second click", async () => {
    const { courseId, lessonId } = await readyItem("map");
    const first = await biteForMapNode(userId, lessonId, "electron");
    const again = await biteForMapNode(userId, lessonId, "electron");
    expect(again).toBe(first);
    const [bite] = await db.select().from(courses).where(eq(courses.id, first));
    expect(bite).toMatchObject({ format: "bite", parentId: courseId });
    expect(bite.topicPrompt).toContain("Electrons");
    await expect(biteForMapNode(userId, lessonId, "nope")).rejects.toThrow(/not on this map/i);
  });

  it("a course gets one cheat sheet built from its outline", async () => {
    const { courseId } = await readyItem("course");
    const id = await cheatSheetFor(userId, courseId);
    expect(await cheatSheetFor(userId, courseId)).toBe(id);
    const [sheet] = await db.select().from(courses).where(eq(courses.id, id));
    expect(sheet).toMatchObject({ format: "cheatsheet", parentId: courseId });
    expect(sheet.topicPrompt).toContain("Where the story begins");
  });

  it("go deeper turns a short item into a full course on the same topic", async () => {
    const { courseId } = await readyItem("bite");
    const id = await goDeeper(userId, courseId);
    const [c] = await db.select().from(courses).where(eq(courses.id, id));
    expect(c).toMatchObject({ format: "course", parentId: courseId, topicPrompt: "Atoms" });
  });

  it("go deeper from a course's cheat sheet leads back to that course instead of copying it", async () => {
    const { courseId } = await readyItem("course");
    const sheet = await cheatSheetFor(userId, courseId);
    expect(await goDeeper(userId, sheet)).toBe(courseId);
  });
});
