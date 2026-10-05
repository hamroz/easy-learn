import { z } from "zod";
import { json, readBody, requireUser, route } from "@/server/http";
import { biteForMapNode } from "@/server/services/derived";

const body = z.object({ nodeId: z.string().min(1).max(40) });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const { nodeId } = await readBody(req, body);
  const id = await biteForMapNode(user.id, (await params).id, nodeId);
  return json({ id, url: `/courses/${id}` });
});
