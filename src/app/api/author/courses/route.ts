import { HttpError, json, requireBearerUser, route } from "@/server/http";
import { importCourseDocument, validateCourseDocument } from "@/server/services/courseDocs";

/** Create a course from a complete or outline-only course document (authoring from Claude Code). */
export const POST = route(async (req) => {
  const user = await requireBearerUser(req);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON course document");
  }
  const v = validateCourseDocument(raw);
  if (!v.ok) return json({ error: "The course document is not valid", issues: v.issues }, { status: 400 });
  const id = await importCourseDocument(user.id, v.doc);
  const origin = process.env.APP_ORIGIN || new URL(req.url).origin;
  return json({ id, url: `${origin}/courses/${id}` });
});
