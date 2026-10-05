import { z } from "zod";
import { json, readBody, requireUser, route } from "@/server/http";
import { listCourses } from "@/server/services/courses";
import { createCourse } from "@/server/services/generation";
import { FORMAT_IDS } from "@/content/formats";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json({ courses: await listCourses(user.id) });
});

const body = z.object({
  topic: z.string().trim().min(2, "Tell me what you want to learn").max(2000),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  format: z.enum(FORMAT_IDS).default("course"),
});

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const input = await readBody(req, body);
  const course = await createCourse(user.id, input);
  return json({ course: { id: course.id, status: course.status } });
});
