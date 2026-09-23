"use client";
import Link from "next/link";
import { useLanguage, type DictKey } from "@/lib/i18n";

export type NavItem = { key: DictKey; href: string; icon: string; adminOnly?: boolean };

export const NAV: NavItem[] = [
  { key: "dashboard", href: "/", icon: "📊" },
  { key: "billing", href: "/billing", icon: "🧾" },
  { key: "medicines", href: "/medicines", icon: "💊" },
  { key: "stock", href: "/stock", icon: "📦" },
  { key: "purchases", href: "/purchases", icon: "🛒" },
  { key: "purchaseReturns", href: "/purchase-returns", icon: "↪️" },
  { key: "suppliers", href: "/suppliers", icon: "🚚" },
  { key: "customers", href: "/customers", icon: "🧑‍🤝‍🧑" },
  { key: "salesHistory", href: "/sales-history", icon: "🕑" },
  { key: "returns", href: "/returns", icon: "↩️" },
  { key: "reports", href: "/reports", icon: "📈" },
  { key: "pharmacyProfile", href: "/settings", icon: "🏥", adminOnly: true },
  { key: "users", href: "/users", icon: "👤", adminOnly: true },
];

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const { t, lang, setLang } = useLanguage();
  const links = NAV.filter((n) => !n.adminOnly || isAdmin);

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
