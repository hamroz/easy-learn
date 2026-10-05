import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { courses } from "@/server/db/schema";
import { json, readBody, requireUser, route } from "@/server/http";
import { courseView, ownedCourse } from "@/server/services/courses";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  return json(await courseView(user.id, (await params).id));
});

const patch = z.object({ isExample: z.boolean().optional(), title: z.string().trim().min(1).max(160).optional() });

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  await ownedCourse(user.id, id);
  const input = await readBody(req, patch);
  await db.update(courses).set(input).where(eq(courses.id, id));
  return json({ ok: true });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  await ownedCourse(user.id, id);
  await db.delete(courses).where(eq(courses.id, id));
  return json({ ok: true });
});
