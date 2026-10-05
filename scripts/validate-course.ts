/**
 * Check a course document before sending it:
 *   npx tsx scripts/validate-course.ts authored/<slug>.json
 */
import { readFile } from "node:fs/promises";
import { validateCourseDocument } from "../src/server/services/courseDocs";

const file = process.argv[2];
if (!file) {
  console.error("usage: validate-course.ts <course.json>");
  process.exit(2);
}
const v = validateCourseDocument(JSON.parse(await readFile(file, "utf8")));
if (!v.ok) {
  console.error(`✗ ${file} is not valid:\n${v.issues.map((i) => `  - ${i}`).join("\n")}`);
  process.exit(1);
}
const written = v.doc.lessons.filter((l) => l.sections.length).length;
console.log(`✓ ${v.doc.course.title}: ${v.doc.lessons.length} lessons (${written} written, ${v.doc.lessons.length - written} outline-only)`);
