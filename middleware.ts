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

  // Admin-only areas.
  // Purchases/Suppliers/Purchase-Returns/Reports/Dashboard-stock-value all carry cost
  // (purchaseRate) or profit figures. Restricting the whole module server-side — not just
  // hiding it in the UI — is what satisfies "profit information must be admin only" even
  // against direct API calls, crafted requests, or a modified frontend.
  const adminOnly = [
    "/users", "/api/users",
    "/api/seed",
    "/api/reset",
    "/settings", "/api/settings",
    "/purchases", "/api/purchases",
    "/purchase-returns", "/api/purchase-returns",
    "/suppliers", "/api/suppliers",
    "/reports", "/api/reports",
  ];
  if (adminOnly.some((p) => pathname === p || pathname.startsWith(p + "/")) && session.role !== "ADMIN") {
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
