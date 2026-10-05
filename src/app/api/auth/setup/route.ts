import { z } from "zod";
import { SetupError, setupOwner } from "@/server/auth/accounts";
import { createSessionToken } from "@/server/auth/session";
import { HttpError, json, readBody, route, sessionCookie } from "@/server/http";

const body = z.object({
  token: z.string(),
  email: z.string().max(200),
  password: z.string().max(500),
  name: z.string().max(100).optional(),
});

export const POST = route(async (req) => {
  const input = await readBody(req, body);
  try {
    const user = await setupOwner(input);
    const { token } = await createSessionToken(user.id);
    return json({ ok: true }, { headers: { "set-cookie": sessionCookie(token) } });
  } catch (e) {
    if (e instanceof SetupError) throw new HttpError(400, e.message);
    throw e;
  }
});
