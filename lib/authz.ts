// Server-side authorization. Every API route and protected page goes through here.
// Permissions are read from the DATABASE on every request (not from the login cookie), so when an
// admin changes or revokes a user's access it takes effect immediately, and deleted users are locked out.
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  can,
  canAny,
  canSeeCostPrices,
  canSeeProfit,
  firstAllowedPath,
  resolvePermissions,
  type Action,
  type ModuleKey,
  type PermissionCheck,
  type Permissions,
} from "@/lib/permissions";

export type AuthContext = {
  user: { id: number; name: string; username: string; role: "ADMIN" | "CASHIER" };
  isAdmin: boolean;
  permissions: Permissions;
};

type HttpError = Error & { status?: number };
function httpError(message: string, status: number): HttpError {
  const e = new Error(message) as HttpError;
  e.status = status;
  return e;
}

/** Current logged-in user + their effective permissions, or null if not logged in / user no longer exists. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session) return null;
  const u = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, username: true, role: true, permissions: true },
  });
  if (!u) return null;
  return {
    user: { id: u.id, name: u.name, username: u.username, role: u.role },
    isAdmin: u.role === "ADMIN",
    permissions: resolvePermissions(u.role, u.permissions),
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw httpError("Unauthorized", 401);
  return ctx;
}

/** API guard: throws 401/403 unless the user has this permission. Use inside try { } catch { return apiError(e) }. */
export async function requirePermission(module: ModuleKey, action: Action = "view"): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!can(ctx.permissions, module, action)) throw httpError("You don't have permission to do this.", 403);
  return ctx;
}

/** API guard for shared lookups (e.g. the POS needs the medicine list): passes if ANY listed permission is held. */
export async function requireAnyPermission(checks: readonly PermissionCheck[]): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!canAny(ctx.permissions, checks)) throw httpError("You don't have permission to do this.", 403);
  return ctx;
}

export async function requireAdminContext(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.isAdmin) throw httpError("Forbidden", 403);
  return ctx;
}

// Re-exported so routes can `import { canSeeCostPrices, omitCostFields }` from one place.
export { canSeeCostPrices, canSeeProfit };
export { omitCostFields } from "@/lib/permissions";

// ---- Page guards (server components / layouts) --------------------------------------------

/**
 * Put in a route's layout.tsx. Typing the URL directly (or navigating client-side) still runs this
 * on the server, so a page the admin hasn't allowed never renders.
 */
export async function guardPage(module: ModuleKey, action: Action = "view") {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.permissions, module, action)) redirect("/access-denied");
  return ctx;
}

export async function guardAnyPage(checks: readonly PermissionCheck[]) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!canAny(ctx.permissions, checks)) redirect("/access-denied");
  return ctx;
}

export async function guardAdminPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.isAdmin) redirect("/access-denied");
  return ctx;
}

/** For "/": show the dashboard if allowed, otherwise send the user to the first page they can open. */
export async function guardDashboard() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.permissions, "dashboard", "view")) {
    const next = firstAllowedPath(ctx.permissions);
    redirect(next && next !== "/" ? next : "/access-denied");
  }
  return ctx;
}
