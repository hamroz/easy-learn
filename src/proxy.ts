import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic check only: pages without a session cookie go to /login.
 * Every page and API route still validates the session against the database.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("el_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|login|setup|widget-libs|favicon.ico|icon|.*\\.(?:svg|png|jpg|ico|webp|js|css|woff2?)$).*)"],
};
