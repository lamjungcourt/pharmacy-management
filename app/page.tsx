"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

export default function Dashboard() {
  const { t, digits } = useLanguage();
  const [d, setD] = useState<any>();
  const [profile, setProfile] = useState<any>();
  const [period, setPeriod] = useState<"today" | "month">("today");

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setD);
    fetch("/api/settings").then((r) => r.json()).then(setProfile);
  }, []);

  if (!d) return <section><h1>{t("dashboard")}</h1><p>{t("loading")}</p></section>;

  const sales = period === "today" ? d.todaySales : d.monthSales;
  const bills = period === "today" ? d.todayBills : d.monthBills;
  const profit = period === "today" ? d.todayProfit : d.monthProfit;
  const purchases = period === "today" ? d.todayPurchases : d.monthPurchases;
  const purchaseCount = period === "today" ? d.todayPurchaseCount : d.monthPurchaseCount;

  const cards = [
    ["💰", period === "today" ? t("todaysSales") : t("thisMonthsSales"), `Rs. ${digits(sales.toFixed(2))}`],
    ["🧾", period === "today" ? t("todaysBills") : t("thisMonthsBills"), digits(bills)],
    ["💵", period === "today" ? t("todaysProfit") : t("thisMonthsProfit"), `Rs. ${digits(profit.toFixed(2))}`],
    ["🛒", period === "today" ? t("todaysPurchases") : t("thisMonthsPurchases"), `Rs. ${digits(purchases.toFixed(2))} (${digits(purchaseCount)})`],
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
      </div>
      <div className="cards">
        {cards.map((c, i) => {
          const linkHref = c[1] === t("dueToSuppliers") ? "/suppliers" : c[1] === t("dueFromCustomers") ? "/customers" : null;
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
        <p>{t("totalStockUnits")}: <b>{digits(d.totalStock)}</b> · {t("stockValue")}: <b>Rs. {digits(d.stockValue.toFixed(2))}</b></p>
        <p>🔴 {t("expired")}: {digits(d.expired)} · 🟠 {t("expiringSoon")}: {digits(d.expiringSoon)} · ⚠️ {t("lowStock")}: {digits(d.lowStock)}</p>
      </div>
      <div className="panel">
        <h2>{t("quickLinks")}</h2>
        <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/billing">🧾 {t("newSale")}</Link>
          <Link href="/purchases">🛒 {t("newPurchase")}</Link>
          <Link href="/medicines">💊 {t("newMedicine")}</Link>
          <Link href="/customers">👤 {t("customers")}</Link>
          <Link href="/suppliers">🏭 {t("suppliers")}</Link>
          <Link href="/purchase-returns">↩️ {t("purchaseReturns")}</Link>
          <Link href="/reports">📊 {t("reports")}</Link>
          <Link href="/users">🛡️ {t("users")}</Link>
        </p>
      </div>
    </section>
  );
}
