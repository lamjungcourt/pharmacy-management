"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  can as canFn,
  canSeeCostPrices,
  type Action,
  type ModuleKey,
  type Permissions,
} from "@/lib/permissions";

type Ctx = {
  isAdmin: boolean;
  permissions: Permissions;
  can: (module: ModuleKey, action?: Action) => boolean;
  canSeeCost: boolean;
};

const PermissionsContext = createContext<Ctx | null>(null);

/**
 * Holds the signed-in user's permissions for the UI (hide menu items / buttons).
 * IMPORTANT: this is for convenience only — the real enforcement is on the server (API routes + page layouts).
 * It's seeded from the server on first render and re-checked on every navigation so changes made by an
 * admin show up without needing to log out.
 */
export function PermissionsProvider({
  initialPermissions,
  initialIsAdmin,
  children,
}: {
  initialPermissions: Permissions;
  initialIsAdmin: boolean;
  children: ReactNode;
}) {
  const [permissions, setPermissions] = useState<Permissions>(initialPermissions);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (cancelled || !me?.permissions) return;
        setPermissions(me.permissions);
        setIsAdmin(me.role === "ADMIN");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const value = useMemo<Ctx>(
    () => ({
      isAdmin,
      permissions,
      can: (module: ModuleKey, action: Action = "view") => canFn(permissions, module, action),
      canSeeCost: canSeeCostPrices(permissions),
    }),
    [isAdmin, permissions]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): Ctx {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions() must be used inside <PermissionsProvider>");
  return ctx;
}
