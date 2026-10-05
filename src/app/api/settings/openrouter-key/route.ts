import { z } from "zod";
import { SecretError } from "@/server/crypto";
import { HttpError, json, readBody, requireUser, route } from "@/server/http";
import { setOpenRouterKey } from "@/server/services/settingsView";

const body = z.object({ key: z.string().trim().min(10).max(300).nullable() });

export const PUT = route(async (req) => {
  const user = await requireUser(req);
  const { key } = await readBody(req, body);
  try {
    return json({ openrouter: await setOpenRouterKey(user.id, key) });
  } catch (e) {
    if (e instanceof SecretError) throw new HttpError(400, e.message);
    throw e;
  }
});
