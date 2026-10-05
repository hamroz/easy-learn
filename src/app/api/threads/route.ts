import { z } from "zod";
import { json, readBody, requireUser, route } from "@/server/http";
import { createThread } from "@/server/services/interactive";

const body = z.object({
  lessonId: z.uuid(),
  sectionId: z.uuid(),
  blockId: z.string().min(1).max(80),
  variantId: z.uuid().nullish(),
  anchor: z.object({
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    quote: z.string().min(1).max(2000),
    prefix: z.string().max(200),
    suffix: z.string().max(200),
  }),
});

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const t = await createThread(user.id, await readBody(req, body));
  return json({ thread: { id: t.id, sectionId: t.sectionId, blockId: t.blockId, variantId: t.variantId, anchor: t.anchor, createdAt: t.createdAt, messages: [] } });
});
