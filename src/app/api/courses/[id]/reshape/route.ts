import { z } from "zod";
import { HttpError, json, readBody, requireUser, route } from "@/server/http";
import { ownedCourse } from "@/server/services/courses";
import { reshapeOutline } from "@/server/services/generation";

const body = z.object({ instruction: z.string().trim().min(2).max(2000) });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const course = await ownedCourse(user.id, (await params).id);
  const { instruction } = await readBody(req, body);
  if (course.status !== "outline_ready") throw new HttpError(409, "The outline can only be reshaped before you start");
  if (!(await reshapeOutline(course.id, instruction))) throw new HttpError(409, "The outline is already being rewritten");
  return json({ ok: true });
});
