import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { courses } from "@/server/db/schema";
import { type CourseDoc, courseDocSchema, importCourseDocument } from "./courseDocs";

/** Example courses shipped in the repository (examples/*.json), produced by scripts/export-course.ts. */
export const exampleFileSchema = courseDocSchema;
export type ExampleFile = CourseDoc;

export const defaultExamplesDir = () => process.env.EXAMPLES_DIR ?? path.join(process.cwd(), "examples");

/** Import every example the user does not have yet. Returns how many courses were added. */
export async function importExamples(userId: string, dir = defaultExamplesDir()): Promise<number> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return 0;
  }
  let added = 0;
  for (const file of files) {
    const parsed = exampleFileSchema.safeParse(JSON.parse(await readFile(path.join(dir, file), "utf8")));
    if (!parsed.success) {
      console.warn(`[examples] skipping ${file}: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    const ex = parsed.data;
    const [exists] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.userId, userId), eq(courses.isExample, true), eq(courses.title, ex.course.title)));
    if (exists) continue;

    await importCourseDocument(userId, ex, { isExample: true });
    added++;
  }
  return added;
}
