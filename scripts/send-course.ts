/**
 * Validate a course document and create it on an Easy Learn instance:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/send-course.ts authored/<slug>.json
 * Needs EASY_LEARN_URL (e.g. http://localhost:3100) and EASY_LEARN_TOKEN (Settings → Authoring access).
 */
import { readFile } from "node:fs/promises";
import { validateCourseDocument } from "../src/server/services/courseDocs";

const file = process.argv[2];
const base = process.env.EASY_LEARN_URL?.replace(/\/$/, "");
const token = process.env.EASY_LEARN_TOKEN;
if (!file || !base || !token) {
  console.error("usage: EASY_LEARN_URL=… EASY_LEARN_TOKEN=… send-course.ts <course.json>");
  process.exit(2);
}
const raw = JSON.parse(await readFile(file, "utf8"));
const v = validateCourseDocument(raw);
if (!v.ok) {
  console.error(`✗ not sent — fix these first:\n${v.issues.map((i) => `  - ${i}`).join("\n")}`);
  process.exit(1);
}
const res = await fetch(`${base}/api/author/courses`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
  body: JSON.stringify(raw),
});
const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; issues?: string[] };
if (!res.ok) {
  console.error(`✗ ${res.status} ${body.error ?? ""}${body.issues ? `\n${body.issues.map((i) => `  - ${i}`).join("\n")}` : ""}`);
  process.exit(1);
}
console.log(`✓ created: ${body.url}`);
