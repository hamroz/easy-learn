import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, closeDb } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { courses, lessons, sections, threads, users } from "@/server/db/schema";
import { resetDb } from "../helpers/db";

beforeAll(async () => {
  await runMigrations();
  await resetDb();
});
afterAll(closeDb);

describe("schema", () => {
  it("cascades course deletion to lessons, sections and threads", async () => {
    const [user] = await db.insert(users).values({ email: "a@example.test", passwordHash: "x" }).returning();
    const [course] = await db
      .insert(courses)
      .values({ userId: user.id, title: "Relativity", topicPrompt: "relativity", language: "en", level: "beginner" })
      .returning();
    const [lesson] = await db
      .insert(lessons)
      .values({ courseId: course.id, position: 0, title: "Light", summary: "Why light is special" })
      .returning();
    const [section] = await db
      .insert(sections)
      .values({ lessonId: lesson.id, position: 0, heading: "A race with light", goal: "intuition" })
      .returning();
    await db.insert(threads).values({
      userId: user.id,
      lessonId: lesson.id,
      sectionId: section.id,
      blockId: "b1",
      anchor: { start: 0, end: 4, quote: "Ligh", prefix: "", suffix: "t" },
    });

    await db.delete(courses).where(eq(courses.id, course.id));

    expect(await db.select().from(lessons)).toHaveLength(0);
    expect(await db.select().from(sections)).toHaveLength(0);
    expect(await db.select().from(threads)).toHaveLength(0);
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it("defaults new courses to outlining, unpublished, non-example", async () => {
    const [user] = await db.select().from(users).limit(1);
    const [course] = await db
      .insert(courses)
      .values({ userId: user.id, title: "", topicPrompt: "x", language: "en", level: "beginner" })
      .returning();
    expect(course.status).toBe("outlining");
    expect(course.isPublished).toBe(false);
    expect(course.isExample).toBe(false);
  });
});
