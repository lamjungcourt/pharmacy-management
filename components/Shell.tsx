"use client";
import Link from "next/link";
import { LanguageProvider, LanguageSwitcher, useI18n } from "@/lib/i18n";
import LogoutButton from "@/components/LogoutButton";

type NavItem = { key: string; label: string; href: string; icon: string; adminOnly?: boolean };

const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/", icon: "📊" },
  { key: "billing", label: "Billing", href: "/billing", icon: "🧾" },
  { key: "medicines", label: "Medicines", href: "/medicines", icon: "💊" },
  { key: "stock", label: "Stock", href: "/stock", icon: "📦" },
  { key: "purchases", label: "Purchases", href: "/purchases", icon: "🛒", adminOnly: true },
  { key: "purchaseReturns", label: "Purchase Returns", href: "/purchase-returns", icon: "↪️", adminOnly: true },
  { key: "suppliersParty", label: "Suppliers (Party)", href: "/suppliers", icon: "🚚", adminOnly: true },
  { key: "customers", label: "Customers", href: "/customers", icon: "🧑‍🤝‍🧑" },
  { key: "salesHistory", label: "Sales History", href: "/sales-history", icon: "🕑" },
  { key: "returns", label: "Returns", href: "/returns", icon: "↩️" },
  { key: "reports", label: "Reports", href: "/reports", icon: "📈", adminOnly: true },
  { key: "pharmacyProfile", label: "Pharmacy Profile", href: "/settings", icon: "🏥", adminOnly: true },
  { key: "users", label: "Users", href: "/users", icon: "👤", adminOnly: true },
];

function ShellInner({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: "ADMIN" | "CASHIER";
}) {
  const { t } = useI18n();
  const links = NAV.filter((n) => !n.adminOnly || userRole === "ADMIN");

  return (
    <div className="shell">
      <aside>
        <h2>💊 {t("pharmacy")}</h2>
        <LanguageSwitcher />
        <nav>
          {links.map((x) => (
            <Link key={x.href} href={x.href}>
              <span className="navicon">{x.icon}</span>
              {t(x.key, x.label)}
            </Link>
          ))}
        </nav>
      </aside>
      <main>
        <header className="appHeader">
          <b>{t("appTitle")}</b>
          <div className="userbox">
            <span className="who">
              {userName} <em>({userRole === "ADMIN" ? t("admin") : t("cashier")})</em>
            </span>
            <LogoutButton label={t("logout")} />
          </div>
        </header>
        {children}
        <footer className="appFooter">
          © {new Date().getFullYear()} Garuda Communication &amp; All Service Center. All rights reserved.
        </footer>
      </main>
    </div>
  );
}

export default function Shell({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: "ADMIN" | "CASHIER";
}) {
  return (
    <LanguageProvider>
      <ShellInner userName={userName} userRole={userRole}>
        {children}
      </ShellInner>
    </LanguageProvider>
  );
}
