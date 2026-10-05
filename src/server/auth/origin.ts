/** CSRF defence for cookie-authenticated writes: the Origin header must be our own origin. */
export function isSameOrigin(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const expected = process.env.APP_ORIGIN || new URL(req.url).origin;
  return origin === expected;
}
