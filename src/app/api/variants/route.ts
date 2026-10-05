import { z } from "zod";
import { json, readBody, requireUser, route } from "@/server/http";
import { getOrCreateVariant } from "@/server/services/interactive";

const body = z.object({ sectionId: z.uuid(), blockId: z.string().min(1).max(80), kind: z.enum(["simpler", "deeper"]) });

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { sectionId, blockId, kind } = await readBody(req, body);
  const v = await getOrCreateVariant(user.id, sectionId, blockId, kind);
  return json({ variant: { id: v.id, sectionId: v.sectionId, blockId: v.blockId, kind: v.kind, md: v.md } });
});
