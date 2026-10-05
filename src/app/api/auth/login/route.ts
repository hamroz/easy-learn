import { z } from "zod";
import { authenticate } from "@/server/auth/accounts";
import { loginLimiter } from "@/server/auth/rateLimit";
import { createSessionToken } from "@/server/auth/session";
import { clientIp, HttpError, json, readBody, route, sessionCookie } from "@/server/http";

const body = z.object({ email: z.string().max(200), password: z.string().max(500) });

export const POST = route(async (req) => {
  const ip = clientIp(req);
  if (loginLimiter.isLimited(ip)) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const { email, password } = await readBody(req, body);
  const user = await authenticate(email, password);
  if (!user) {
    loginLimiter.fail(ip);
    throw new HttpError(401, "Wrong email or password");
  }
  loginLimiter.succeed(ip);
  const { token } = await createSessionToken(user.id);
  return json({ ok: true }, { headers: { "set-cookie": sessionCookie(token) } });
});
