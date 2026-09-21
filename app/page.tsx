"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Dashboard() {
  const [d, setD] = useState<any>();
  const [profile, setProfile] = useState<any>();
  const [period, setPeriod] = useState<"today" | "month">("today");

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setD);
    fetch("/api/settings").then((r) => r.json()).then(setProfile);
  }, []);

  if (!d) return <section><h1>Dashboard</h1><p>Loading…</p></section>;

  const sales = period === "today" ? d.todaySales : d.monthSales;
  const bills = period === "today" ? d.todayBills : d.monthBills;
  const profit = period === "today" ? d.todayProfit : d.monthProfit;
  const purchases = period === "today" ? d.todayPurchases : d.monthPurchases;
  const purchaseCount = period === "today" ? d.todayPurchaseCount : d.monthPurchaseCount;

  const cards = [
    ["💰", `${period === "today" ? "Today's" : "This Month's"} Sales`, `Rs. ${sales.toFixed(2)}`],
    ["🧾", `${period === "today" ? "Today's" : "This Month's"} Bills`, bills],
    ["💵", `${period === "today" ? "Today's" : "This Month's"} Profit`, `Rs. ${profit.toFixed(2)}`],
    ["🛒", `${period === "today" ? "Today's" : "This Month's"} Purchases`, `Rs. ${purchases.toFixed(2)} (${purchaseCount})`],
    ["💊", "Total Medicines", d.totalMedicines],
    ["📦", "Total Stock", d.totalStock],
    ["⚠️", "Low Stock", d.lowStock],
    ["🔴", "Expired", d.expired],
    ["🟠", "Expiring Soon", d.expiringSoon],
    ["📥", "Due to Suppliers", `Rs. ${d.totalSupplierDue.toFixed(2)}`],
    ["📤", "Due from Customers", `Rs. ${d.totalCustomerDue.toFixed(2)}`],
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
          {profile?.phone && <p className="dashboardBrandPhone">📞 {profile.phone}</p>}
        </div>
      </div>
      <div className="panel" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <strong>View:</strong>
        <button className={period === "today" ? "" : "ghost"} onClick={() => setPeriod("today")}>Daily</button>
        <button className={period === "month" ? "" : "ghost"} onClick={() => setPeriod("month")}>Monthly</button>
      </div>
      <div className="cards">
        {cards.map((c) => (
          <div className="card" key={c[1] as string}>
            <span>{c[0]}</span>
            <small>{c[1]}</small>
            <strong>{c[2]}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Stock Overview</h2>
        <p>Total stock units: <b>{d.totalStock}</b> · Stock value: <b>Rs. {d.stockValue.toFixed(2)}</b></p>
        <p>🔴 Expired: {d.expired} · 🟠 Expiring within 90 days: {d.expiringSoon} · ⚠️ Low stock: {d.lowStock}</p>
      </div>
      <div className="panel">
        <h2>Quick links</h2>
        <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/billing">🧾 New Sale</Link>
          <Link href="/purchases">🛒 New Purchase</Link>
          <Link href="/medicines">💊 New Medicine</Link>
          <Link href="/customers">👤 Customers</Link>
          <Link href="/suppliers">🏭 Suppliers (Party)</Link>
          <Link href="/purchase-returns">↩️ Purchase Returns</Link>
          <Link href="/reports">📊 Reports</Link>
          <Link href="/users">🛡️ Users</Link>
        </p>
      </div>
    </section>
  );
}
