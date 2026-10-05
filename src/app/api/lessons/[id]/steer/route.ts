import { z } from "zod";
import { HttpError, json, readBody, requireUser, route } from "@/server/http";
import { ownedLesson } from "@/server/services/courses";
import { steerCourse } from "@/server/services/generation";

const body = z.object({ instruction: z.string().trim().min(2).max(2000) });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { lesson, course } = await ownedLesson(user.id, (await params).id);
  const { instruction } = await readBody(req, body);
  if (!(await steerCourse(course.id, lesson.position, instruction))) throw new HttpError(409, "The course is already being updated");
  return json({ ok: true });
});
