import { revokeToken, SESSION_COOKIE } from "@/server/auth/session";
import { clearedSessionCookie, json, readCookie, route } from "@/server/http";

export const POST = route(async (req) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await revokeToken(token);
  return json({ ok: true }, { headers: { "set-cookie": clearedSessionCookie() } });
});
