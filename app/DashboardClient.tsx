"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { usePermissions } from "@/components/PermissionsProvider";

export default function Dashboard() {
  const { t, digits } = useLanguage();
  const { can, isAdmin } = usePermissions();
  const [d, setD] = useState<any>();
  const [profile, setProfile] = useState<any>();
  const [period, setPeriod] = useState<"today" | "month" | "year">("today");

  useEffect(() => {
    fetch("/api/dashboard").then((r) => (r.ok ? r.json() : null)).then((j) => j && setD(j));
    fetch("/api/settings").then((r) => (r.ok ? r.json() : null)).then((j) => j && setProfile(j));
  }, []);

  if (!d) return <section><h1>{t("dashboard")}</h1><p>{t("loading")}</p></section>;

  // `financial` is only present in the API response when this user may see profit (Admin, or granted by Admin).
  // The server simply doesn't send those numbers otherwise, so there's nothing to reveal by inspecting the network tab.
  const fin = d.financial as { todayProfit: number; monthProfit: number; yearProfit: number; stockValue: number } | undefined;

  const pick = <T,>(today: T, month: T, year: T) => (period === "today" ? today : period === "month" ? month : year);
  const sales = pick(d.todaySales, d.monthSales, d.yearSales);
  const bills = pick(d.todayBills, d.monthBills, d.yearBills);
  const purchases = pick(d.todayPurchases, d.monthPurchases, d.yearPurchases);
  const purchaseCount = pick(d.todayPurchaseCount, d.monthPurchaseCount, d.yearPurchaseCount);
  const profit = fin ? pick(fin.todayProfit, fin.monthProfit, fin.yearProfit) : null;

  const cards: [string, string, string][] = [
    ["💰", pick(t("todaysSales"), t("thisMonthsSales"), t("thisYearsSales")), `Rs. ${digits(sales.toFixed(2))}`],
    ["🧾", pick(t("todaysBills"), t("thisMonthsBills"), t("thisYearsBills")), digits(bills)],
    ...(profit !== null
      ? ([["💵", pick(t("todaysProfit"), t("thisMonthsProfit"), t("thisYearsProfit")), `Rs. ${digits(profit.toFixed(2))}`]] as [string, string, string][])
      : []),
    ["🛒", pick(t("todaysPurchases"), t("thisMonthsPurchases"), t("thisYearsPurchases")), `Rs. ${digits(purchases.toFixed(2))} (${digits(purchaseCount)})`],
    ["💊", t("totalMedicines"), digits(d.totalMedicines)],
    ["📦", t("totalStock"), digits(d.totalStock)],
    ["⚠️", t("lowStock"), digits(d.lowStock)],
    ["🔴", t("expired"), digits(d.expired)],
    ["🟠", t("expiringSoon"), digits(d.expiringSoon)],
    ["📥", t("dueToSuppliers"), `Rs. ${digits(d.totalSupplierDue.toFixed(2))}`],
    ["📤", t("dueFromCustomers"), `Rs. ${digits(d.totalCustomerDue.toFixed(2))}`],
  ];

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
          {profile?.phone && <p className="dashboardBrandPhone">📞 {digits(profile.phone)}</p>}
        </div>
      </div>
      <div className="panel" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <strong>{t("viewLabel")}</strong>
        <button className={period === "today" ? "" : "ghost"} onClick={() => setPeriod("today")}>{t("daily")}</button>
        <button className={period === "month" ? "" : "ghost"} onClick={() => setPeriod("month")}>{t("monthly")}</button>
        <button className={period === "year" ? "" : "ghost"} onClick={() => setPeriod("year")}>{t("yearly")}</button>
      </div>
      {fin && (
        <div className="panel">
          <h2>💵 {t("profitSummary")}</h2>
          <div className="cards" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="card"><small>{t("todaysProfit")}</small><strong>Rs. {digits(fin.todayProfit.toFixed(2))}</strong></div>
            <div className="card"><small>{t("thisMonthsProfit")}</small><strong>Rs. {digits(fin.monthProfit.toFixed(2))}</strong></div>
            <div className="card"><small>{t("thisYearsProfit")}</small><strong>Rs. {digits(fin.yearProfit.toFixed(2))}</strong></div>
          </div>
          <p style={{ color: "#667085", fontSize: 13, marginBottom: 0 }}>🔒 {t("profitSummaryNote")}</p>
        </div>
      )}
      <div className="cards">
        {cards.map((c, i) => {
          const linkHref =
            c[1] === t("dueToSuppliers") && can("suppliers") ? "/suppliers"
            : c[1] === t("dueFromCustomers") && can("customers") ? "/customers"
            : null;
          const body = (
            <>
              <span>{c[0]}</span>
              <small>{c[1]}</small>
              <strong>{c[2]}</strong>
            </>
          );
          return linkHref ? (
            <Link className="card" href={linkHref} key={i}>{body}</Link>
          ) : (
            <div className="card" key={i}>{body}</div>
          );
        })}
      </div>
      <div className="panel">
        <h2>{t("stockOverview")}</h2>
        <p>{t("totalStockUnits")}: <b>{digits(d.totalStock)}</b>{fin && <> · {t("stockValue")}: <b>Rs. {digits(fin.stockValue.toFixed(2))}</b></>}</p>
        <p>🔴 {t("expired")}: {digits(d.expired)} · 🟠 {t("expiringSoon")}: {digits(d.expiringSoon)} · ⚠️ {t("lowStock")}: {digits(d.lowStock)}</p>
      </div>
      <div className="panel">
        <h2>{t("quickLinks")}</h2>
        <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {can("billing") && <Link href="/billing">🧾 {t("newSale")}</Link>}
          {can("purchases") && <Link href="/purchases">🛒 {t("newPurchase")}</Link>}
          {can("medicines") && <Link href="/medicines">💊 {t("newMedicine")}</Link>}
          {can("customers") && <Link href="/customers">👤 {t("customers")}</Link>}
          {can("suppliers") && <Link href="/suppliers">🏭 {t("suppliers")}</Link>}
          {can("purchaseReturns") && <Link href="/purchase-returns">↩️ {t("purchaseReturns")}</Link>}
          {can("reports") && <Link href="/reports">📊 {t("reports")}</Link>}
          {isAdmin && <Link href="/users">🛡️ {t("users")}</Link>}
        </p>
      </div>
    </section>
  );
}
