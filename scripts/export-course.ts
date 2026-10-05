/**
 * Export a course from the database as an example file:
 *   npx tsx --env-file=.env.local scripts/export-course.ts <courseId> examples/<slug>.json
 * Only lessons that are fully written keep their sections; the rest stay planned (they are written on demand).
 */
import { writeFile } from "node:fs/promises";
import { asc, eq } from "drizzle-orm";
import { closeDb, db } from "../src/server/db/client";
import { courses, lessons, sections } from "../src/server/db/schema";
import type { Block } from "../src/content/blocks";
import type { ExampleFile } from "../src/server/services/examples";

/** Custom simulations that never finished are replaced by their library fallback. */
function finished(blocks: Block[]): Block[] {
  return blocks.flatMap((b) => (b.type === "custom" && (b.status !== "ready" || !b.code) ? (b.fallback ? [b.fallback] : []) : [b]));
}

async function main() {
  const [courseId, out] = process.argv.slice(2);
  if (!courseId || !out) throw new Error("usage: export-course.ts <courseId> <out.json>");
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) throw new Error("course not found");
  const ls = await db.select().from(lessons).where(eq(lessons.courseId, courseId)).orderBy(asc(lessons.position));

  const file: ExampleFile = {
    version: 1,
    course: {
      title: course.title,
      subtitle: course.subtitle,
      topicPrompt: course.topicPrompt,
      language: course.language,
      level: course.level,
      theme: course.theme!,
      coverSvg: course.coverSvg,
    },
    lessons: [],
  };
  for (const l of ls) {
    const secs = await db.select().from(sections).where(eq(sections.lessonId, l.id)).orderBy(asc(sections.position));
    const complete = l.status === "ready" && secs.length > 0 && secs.every((s) => s.status === "ready");
    file.lessons.push({
      title: l.title,
      summary: l.summary,
      plan: complete ? l.plan : null,
      sections: complete ? secs.map((s) => ({ heading: s.heading, goal: s.goal, blocks: finished(s.blocks) })) : [],
    });
  }
  await writeFile(out, `${JSON.stringify(file, null, 1)}\n`);
  console.log(`wrote ${out}: ${file.lessons.filter((l) => l.sections.length).length}/${file.lessons.length} lessons written`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closeDb);
