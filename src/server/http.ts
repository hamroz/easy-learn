import { ZodError, type z } from "zod";
import { isSameOrigin } from "@/server/auth/origin";
import { SESSION_COOKIE, SESSION_TTL_MS, userFromToken } from "@/server/auth/session";
import type { User } from "@/server/db/schema";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const json = (data: unknown, init: ResponseInit = {}) => Response.json(data, init);

export async function readBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
  return schema.parse(raw);
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

const secureCookies = () => (process.env.APP_ORIGIN ?? "").startsWith("https://");

export function sessionCookie(token: string) {
  const attrs = [`${SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`];
  if (secureCookies()) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearedSessionCookie() {
  const attrs = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secureCookies()) attrs.push("Secure");
  return attrs.join("; ");
}

export async function requireUser(req: Request): Promise<User> {
  const user = await userFromToken(readCookie(req, SESSION_COOKIE));
  if (!user) throw new HttpError(401, "Please sign in");
  return user;
}

/**
 * Wrap a route handler: same-origin check for writes, and uniform JSON errors
 * (HttpError → its status, ZodError → 400, anything else → 500).
 */
export function route<Ctx = unknown>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      if (!isSameOrigin(req)) throw new HttpError(403, "Cross-origin request blocked");
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return json({ error: "Invalid request", issues: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
      console.error("[api]", req.method, new URL(req.url).pathname, e);
      return json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
