import { z } from "zod";
import { json, readBody, requireUser, route } from "@/server/http";
import { replaceOutline } from "@/server/services/courses";

const body = z.object({
  lessons: z
    .array(z.object({ title: z.string().trim().min(1).max(160), summary: z.string().trim().max(600).default("") }))
    .min(1)
    .max(20),
});

export const PUT = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { lessons } = await readBody(req, body);
  await replaceOutline(user.id, (await params).id, lessons);
  return json({ ok: true });
});
