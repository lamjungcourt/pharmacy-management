"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function Dashboard() {
  const { t, digits } = useI18n();
  const [d, setD] = useState<any>();
  const [profile, setProfile] = useState<any>();
  const [me, setMe] = useState<any>();
  const [period, setPeriod] = useState<"today" | "month">("today");

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setD);
    fetch("/api/settings").then((r) => r.json()).then(setProfile);
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setMe);
  }, []);

  if (!d) return <section><h1>{t("dashboard")}</h1><p>{t("loading")}</p></section>;

  const isAdmin = me?.role === "ADMIN";
  const sales = period === "today" ? d.todaySales : d.monthSales;
  const bills = period === "today" ? d.todayBills : d.monthBills;
  const profit = period === "today" ? d.todayProfit : d.monthProfit;
  const purchases = period === "today" ? d.todayPurchases : d.monthPurchases;
  const purchaseCount = period === "today" ? d.todayPurchaseCount : d.monthPurchaseCount;
  const rs = (n: number) => `Rs. ${digits(n.toFixed(2))}`;

  const cards: [string, string, string | number][] = [
    ["💰", t(period === "today" ? "todaySales" : "monthSales"), rs(sales)],
    ["🧾", t(period === "today" ? "todayBills" : "monthBills"), digits(bills)],
  ];
  // Profit and purchase spend are cost-derived — the API already returns null for a
  // Cashier session, and the dashboard simply never renders those cards for them.
  if (isAdmin) {
    cards.push(["💵", t(period === "today" ? "todayProfit" : "monthProfit"), rs(Number(profit ?? 0))]);
    cards.push(["🛒", t(period === "today" ? "todayPurchases" : "monthPurchases"), `${rs(Number(purchases ?? 0))} (${digits(purchaseCount ?? 0)})`]);
  }
  cards.push(
    ["💊", t("totalMedicines"), digits(d.totalMedicines)],
    ["📦", t("totalStockUnits"), digits(d.totalStock)],
    ["⚠️", t("lowStockItems"), digits(d.lowStock)],
    ["🔴", t("expired", "Expired"), digits(d.expired)],
    ["🟠", t("expiringSoon"), digits(d.expiringSoon)],
    ["📤", t("customerDue"), rs(d.totalCustomerDue)],
  );
  if (isAdmin) cards.push(["📥", t("supplierDue"), rs(Number(d.totalSupplierDue ?? 0))]);

  return (
    <section>
      <div className="dashboardBrand">
        {profile?.logoUrl ? (
          <img src={profile.logoUrl} alt={`${profile?.name || "Pharmacy"} logo`} />
        ) : (
          <span className="dashboardBrandFallback">🏥</span>
        )}
        <div>
          <h1>{profile?.name || "Pharmacy"}</h1>
          {profile?.phone && <p className="dashboardBrandPhone">📞 {profile.phone}</p>}
        </div>
      </div>
      <div className="panel" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <strong>{t("view", "View")}:</strong>
        <button className={period === "today" ? "" : "ghost"} onClick={() => setPeriod("today")}>{t("today")}</button>
        <button className={period === "month" ? "" : "ghost"} onClick={() => setPeriod("month")}>{t("thisMonth")}</button>
      </div>
      <div className="cards">
        {cards.map((c, i) => (
          <div className="card" key={i}>
            <span>{c[0]}</span>
            <small>{c[1]}</small>
            <strong>{c[2]}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>{t("stock")} {t("view", "Overview")}</h2>
        <p>
          {t("totalStockUnits")}: <b>{digits(d.totalStock)}</b>
          {isAdmin && <> · {t("stockValue")}: <b>{rs(Number(d.stockValue ?? 0))}</b></>}
        </p>
        <p>🔴 {t("expired", "Expired")}: {digits(d.expired)} · 🟠 {t("expiringSoon")}: {digits(d.expiringSoon)} · ⚠️ {t("lowStockItems")}: {digits(d.lowStock)}</p>
      </div>
      <div className="panel">
        <h2>{t("quickActions")}</h2>
        <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/billing">🧾 {t("newSale")}</Link>
          <Link href="/medicines">💊 {t("medicines")}</Link>
          <Link href="/customers">👤 {t("customers")}</Link>
          {isAdmin && <Link href="/purchases">🛒 {t("newPurchase")}</Link>}
          {isAdmin && <Link href="/suppliers">🏭 {t("suppliersParty")}</Link>}
          {isAdmin && <Link href="/purchase-returns">↩️ {t("purchaseReturns")}</Link>}
          {isAdmin && <Link href="/reports">📊 {t("reports")}</Link>}
          {isAdmin && <Link href="/users">🛡️ {t("users")}</Link>}
        </p>
      </div>
    </section>
  );
}
