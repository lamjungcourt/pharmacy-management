import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only areas. (Fine-grained per-module permissions are enforced inside each API route and page
  // layout via lib/authz.ts, because they live in the database and middleware can't query it.)
  // Reading shop settings (name, logo, VAT rate) is allowed for any signed-in user — the POS needs the VAT rate.
  const adminOnly = ["/users", "/api/users", "/api/seed", "/settings", "/api/settings"];
  const isPublicSettingsRead = pathname === "/api/settings" && req.method === "GET";
  if (
    !isPublicSettingsRead &&
    adminOnly.some((p) => pathname === p || pathname.startsWith(p + "/")) &&
    session.role !== "ADMIN"
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
