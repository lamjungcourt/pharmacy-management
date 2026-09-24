// Shared permission model — pure TypeScript, no server/client-only imports, so it can be used
// by API routes, server components, and client components alike.
//
// Permissions are stored per user as JSON:  { medicines: ["view","add"], reports: ["view"], profit: ["view"] }
// ADMIN users ignore the stored value and always get everything.

export type Action = "view" | "add" | "edit" | "delete";

// Which actions exist for each module. Only actions that map to a real feature/endpoint are listed.
export const PERMISSION_MODULES = {
  dashboard: ["view"],
  billing: ["view", "add"], // POS / new sale
  salesHistory: ["view"],
  returns: ["view", "add"], // customer returns
  medicines: ["view", "add", "delete"],
  stock: ["view", "edit"], // "edit" = manual stock adjustment
  purchases: ["view", "add"],
  purchaseReturns: ["view", "add"],
  suppliers: ["view", "add", "edit", "delete"], // "edit" also covers recording payments to a supplier
  customers: ["view", "add", "edit", "delete"], // "edit" also covers recording payments from a customer
  reports: ["view"],
  // Financial/profit information: daily/monthly/yearly profit, profit in reports, buy-rate/cost data.
  // Admin-only unless an admin explicitly grants it to a user.
  profit: ["view"],
} as const satisfies Record<string, readonly Action[]>;

export type ModuleKey = keyof typeof PERMISSION_MODULES;
export type Permissions = Partial<Record<ModuleKey, Action[]>>;

export const MODULE_KEYS = Object.keys(PERMISSION_MODULES) as ModuleKey[];
export const ALL_ACTIONS: Action[] = ["view", "add", "edit", "delete"];

export function actionsFor(module: ModuleKey): readonly Action[] {
  return PERMISSION_MODULES[module];
}

/** Everything, including profit. This is what an ADMIN gets. */
export function fullPermissions(): Permissions {
  const out: Permissions = {};
  for (const m of MODULE_KEYS) out[m] = [...PERMISSION_MODULES[m]];
  return out;
}

/** Full access to operational modules, but NOT profit/financial info. Handy preset for trusted staff. */
export function allExceptProfit(): Permissions {
  const out = fullPermissions();
  delete out.profit;
  return out;
}

/**
 * What a normal user gets when an admin hasn't customised their permissions yet
 * (e.g. accounts created before this feature existed). Deliberately least-privilege.
 */
export const DEFAULT_USER_PERMISSIONS: Permissions = {
  dashboard: ["view"],
  billing: ["view", "add"],
  salesHistory: ["view"],
  medicines: ["view"],
  stock: ["view"],
  customers: ["view", "add"],
};

export function defaultUserPermissions(): Permissions {
  const out: Permissions = {};
  for (const m of MODULE_KEYS) {
    const a = DEFAULT_USER_PERMISSIONS[m];
    if (a) out[m] = [...a];
  }
  return out;
}

/**
 * Turn untrusted input into a clean Permissions object:
 *  - unknown modules / actions are dropped
 *  - actions a module doesn't support are dropped
 *  - add/edit/delete imply view (you can't add to something you can't open)
 *  - modules with no actions are omitted
 */
export function sanitizePermissions(input: unknown): Permissions {
  const out: Permissions = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  const raw = input as Record<string, unknown>;
  for (const m of MODULE_KEYS) {
    const list = raw[m];
    if (!Array.isArray(list)) continue;
    const allowed = new Set<Action>();
    for (const a of list) {
      if ((PERMISSION_MODULES[m] as readonly string[]).includes(a as string)) allowed.add(a as Action);
    }
    if (allowed.size === 0) continue;
    allowed.add("view");
    // keep a stable order: view, add, edit, delete
    out[m] = ALL_ACTIONS.filter((a) => allowed.has(a));
  }
  return out;
}

/** Effective permissions for a user record. `stored` is the raw JSON column (may be null). */
export function resolvePermissions(role: "ADMIN" | "CASHIER", stored: unknown): Permissions {
  if (role === "ADMIN") return fullPermissions();
  if (stored === null || stored === undefined) return defaultUserPermissions();
  return sanitizePermissions(stored);
}

export function can(perms: Permissions | null | undefined, module: ModuleKey, action: Action = "view"): boolean {
  return !!perms && (perms[module]?.includes(action) ?? false);
}

export type PermissionCheck = readonly [ModuleKey, Action];

export function canAny(perms: Permissions | null | undefined, checks: readonly PermissionCheck[]): boolean {
  return checks.some(([m, a]) => can(perms, m, a));
}

/** Profit figures (and per-sale cost data that would reveal them). Admin-only unless granted. */
export function canSeeProfit(perms: Permissions | null | undefined): boolean {
  return can(perms, "profit", "view");
}

/**
 * Buy-rate (cost price) visibility. Cost prices + selling prices reveal profit, so they're
 * treated as financial data: visible with the Profit permission, or to people whose job is
 * purchasing (Purchases / Purchase Returns), where buy rates ARE the data they manage.
 */
export function canSeeCostPrices(perms: Permissions | null | undefined): boolean {
  return canAny(perms, [
    ["profit", "view"],
    ["purchases", "view"],
    ["purchaseReturns", "view"],
  ]);
}

/** Sidebar / landing order. Used to pick a sensible first page for a user. */
export const ROUTE_ORDER: { module: ModuleKey; href: string }[] = [
  { module: "dashboard", href: "/" },
  { module: "billing", href: "/billing" },
  { module: "medicines", href: "/medicines" },
  { module: "stock", href: "/stock" },
  { module: "purchases", href: "/purchases" },
  { module: "purchaseReturns", href: "/purchase-returns" },
  { module: "suppliers", href: "/suppliers" },
  { module: "customers", href: "/customers" },
  { module: "salesHistory", href: "/sales-history" },
  { module: "returns", href: "/returns" },
  { module: "reports", href: "/reports" },
];

/** First page the user is allowed to open, or null if they have none. */
export function firstAllowedPath(perms: Permissions | null | undefined): string | null {
  const hit = ROUTE_ORDER.find((r) => can(perms, r.module, "view"));
  return hit ? hit.href : null;
}

// ---- Response redaction -------------------------------------------------------------------

const COST_KEYS = new Set(["purchaseRate"]);

/** Recursively strips buy-rate fields from an API payload (arrays, nested objects; Dates preserved). */
export function omitCostFields<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => omitCostFields(v)) as unknown as T;
  if (value instanceof Date) return value;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (COST_KEYS.has(k)) continue;
      out[k] = omitCostFields(v);
    }
    return out as T;
  }
  return value;
}
