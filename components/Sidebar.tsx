"use client";
import Link from "next/link";
import { useLanguage, type DictKey } from "@/lib/i18n";
import { usePermissions } from "@/components/PermissionsProvider";
import type { ModuleKey } from "@/lib/permissions";

// `module` = the permission that must include "view" for the item to show. `adminOnly` items are never delegated.
export type NavItem = { key: DictKey; href: string; icon: string; module?: ModuleKey; adminOnly?: boolean };

export const NAV: NavItem[] = [
  { key: "dashboard", module: "dashboard", href: "/", icon: "📊" },
  { key: "billing", module: "billing", href: "/billing", icon: "🧾" },
  { key: "medicines", module: "medicines", href: "/medicines", icon: "💊" },
  { key: "stock", module: "stock", href: "/stock", icon: "📦" },
  { key: "purchases", module: "purchases", href: "/purchases", icon: "🛒" },
  { key: "purchaseReturns", module: "purchaseReturns", href: "/purchase-returns", icon: "↪️" },
  { key: "suppliers", module: "suppliers", href: "/suppliers", icon: "🚚" },
  { key: "customers", module: "customers", href: "/customers", icon: "🧑‍🤝‍🧑" },
  { key: "salesHistory", module: "salesHistory", href: "/sales-history", icon: "🕑" },
  { key: "returns", module: "returns", href: "/returns", icon: "↩️" },
  { key: "reports", module: "reports", href: "/reports", icon: "📈" },
  { key: "pharmacyProfile", href: "/settings", icon: "🏥", adminOnly: true },
  { key: "users", href: "/users", icon: "👤", adminOnly: true },
];

export default function Sidebar() {
  const { t, lang, setLang } = useLanguage();
  const { isAdmin, can } = usePermissions();
  const links = NAV.filter((n) => (n.adminOnly ? isAdmin : n.module ? can(n.module, "view") : false));

  return (
    <aside>
      <h2>💊 {t("pharmacyBrand")}</h2>
      <div className="langToggle">
        <button className={lang === "en" ? "" : "ghost"} onClick={() => setLang("en")}>EN</button>
        <button className={lang === "ne" ? "" : "ghost"} onClick={() => setLang("ne")}>ने</button>
      </div>
      <nav>
        {links.map((x) => (
          <Link key={x.href} href={x.href}>
            <span className="navicon">{x.icon}</span>
            {t(x.key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
