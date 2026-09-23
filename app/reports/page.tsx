"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

type PeriodRow = { period: string; bills?: number; revenue?: number; profit?: number; count?: number; amount?: number; paid?: number; due?: number };
type Report = {
  groupBy: "day" | "month" | "year";
  summary: {
    billCount: number; totalRevenue: number; totalDiscount: number; totalTax: number; totalProfit: number;
    purchaseCount: number; totalPurchaseAmount: number; totalPurchasePaid: number; totalPurchaseDue: number; totalPurchaseReturned: number;
    totalSupplierDue: number; totalCustomerDue: number;
  };
  salesByPeriod: PeriodRow[];
  purchasesByPeriod: PeriodRow[];
  topMedicines: { name: string; quantity: number; revenue: number }[];
  lowStock: { medicine: string; batch: string; quantity: number; minStock: number }[];
  expired: { medicine: string; batch: string; quantity: number; expiryDate: string }[];
  expiringSoon: { medicine: string; batch: string; quantity: number; expiryDate: string }[];
  supplierDues: { id: number; name: string; dueAmount: number }[];
  customerDues: { id: number; name: string; dueAmount: number }[];
};

export default function ReportsPage() {
  const { t, digits, formatDate } = useLanguage();
  const [groupBy, setGroupBy] = useState<"day" | "month" | "year">("day");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [r, setR] = useState<Report | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("groupBy", groupBy);
    fetch("/api/reports?" + params.toString()).then((res) => res.json()).then(setR);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  if (!r) return <section><h1>{t("reportsTitle")}</h1><p>{t("loading")}</p></section>;

  const maxRevenue = Math.max(1, ...r.topMedicines.map((m) => m.revenue));
  const maxSales = Math.max(1, ...r.salesByPeriod.map((p) => p.revenue || 0));
  const maxPurchase = Math.max(1, ...r.purchasesByPeriod.map((p) => p.amount || 0));

  return (
    <section>
      <h1>{t("reportsTitle")}</h1>
      <div className="panel">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button className={groupBy === "day" ? "" : "ghost"} onClick={() => setGroupBy("day")}>{t("daily")}</button>
          <button className={groupBy === "month" ? "" : "ghost"} onClick={() => setGroupBy("month")}>{t("monthly")}</button>
          <button className={groupBy === "year" ? "" : "ghost"} onClick={() => setGroupBy("year")}>{t("yearly")}</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <label>{t("from")}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>{t("to")}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <button onClick={load}>{t("apply")}</button>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>{t("salesReport")}</h2>
      <div className="cards">
        <div className="card"><span>🧾</span><small>{t("bills")}</small><strong>{digits(r.summary.billCount)}</strong></div>
        <div className="card"><span>💰</span><small>{t("revenue")}</small><strong>Rs. {digits(r.summary.totalRevenue.toFixed(2))}</strong></div>
        <div className="card"><span>💵</span><small>{t("profit")}</small><strong>Rs. {digits(r.summary.totalProfit.toFixed(2))}</strong></div>
        <div className="card"><span>🏷️</span><small>{t("discounts")}</small><strong>Rs. {digits(r.summary.totalDiscount.toFixed(2))}</strong></div>
      </div>
      <div className="panel">
        <h3>{groupBy === "day" ? t("dailySales") : groupBy === "month" ? t("monthlySales") : t("yearlySales")}</h3>
        <div className="barChart">
          {r.salesByPeriod.map((p) => (
            <div className="barRow" key={p.period}>
              <span className="barLabel">{p.period}</span>
              <div className="barTrack"><div className="barFill" style={{ width: `${((p.revenue || 0) / maxSales) * 100}%` }} /></div>
              <span className="barValue">Rs. {digits((p.revenue || 0).toFixed(0))} ({digits(p.bills || 0)} {t("billsWord")})</span>
            </div>
          ))}
          {!r.salesByPeriod.length && <p>{t("noSalesInPeriod")}</p>}
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>{t("purchaseReport")}</h2>
      <div className="cards">
        <div className="card"><span>🛒</span><small>{t("purchasesLabel")}</small><strong>{digits(r.summary.purchaseCount)}</strong></div>
        <div className="card"><span>💰</span><small>{t("purchaseAmount")}</small><strong>Rs. {digits(r.summary.totalPurchaseAmount.toFixed(2))}</strong></div>
        <div className="card"><span>✅</span><small>{t("cashPaidLabel")}</small><strong>Rs. {digits(r.summary.totalPurchasePaid.toFixed(2))}</strong></div>
        <div className="card"><span>📥</span><small>{t("dueToSuppliers")}</small><strong>Rs. {digits(r.summary.totalPurchaseDue.toFixed(2))}</strong></div>
        <div className="card"><span>↪️</span><small>{t("purchaseReturnsLabel")}</small><strong>Rs. {digits(r.summary.totalPurchaseReturned.toFixed(2))}</strong></div>
      </div>
      <div className="panel">
        <h3>{groupBy === "day" ? t("dailyPurchases") : groupBy === "month" ? t("monthlyPurchases") : t("yearlyPurchases")}</h3>
        <div className="barChart">
          {r.purchasesByPeriod.map((p) => (
            <div className="barRow" key={p.period}>
              <span className="barLabel">{p.period}</span>
              <div className="barTrack"><div className="barFill" style={{ width: `${((p.amount || 0) / maxPurchase) * 100}%` }} /></div>
              <span className="barValue">Rs. {digits((p.amount || 0).toFixed(0))} ({t("paidWord")} Rs. {digits((p.paid || 0).toFixed(0))}, {t("dueWord")} Rs. {digits((p.due || 0).toFixed(0))})</span>
            </div>
          ))}
          {!r.purchasesByPeriod.length && <p>{t("noPurchasesInPeriod")}</p>}
        </div>
      </div>

      <div className="panel">
        <h2>{t("topSellingMedicines")}</h2>
        <div className="barChart">
          {r.topMedicines.map((m) => (
            <div className="barRow" key={m.name}>
              <span className="barLabel">{m.name}</span>
              <div className="barTrack"><div className="barFill" style={{ width: `${(m.revenue / maxRevenue) * 100}%` }} /></div>
              <span className="barValue">Rs. {digits(m.revenue.toFixed(0))} ({digits(m.quantity)} {t("unitsWord")})</span>
            </div>
          ))}
          {!r.topMedicines.length && <p>{t("noSalesInPeriod")}</p>}
        </div>
      </div>

      <div className="panel">
        <h2>{t("amountDueToSuppliers")}</h2>
        <table>
          <thead><tr><th>{t("supplierCol")}</th><th>{t("dueCol")}</th></tr></thead>
          <tbody>
            {r.supplierDues.map((s) => <tr key={s.id}><td>{s.name}</td><td>Rs. {digits(s.dueAmount.toFixed(2))}</td></tr>)}
            {!r.supplierDues.length && <tr><td colSpan={2}>{t("noOutstandingDues")}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>{t("amountDueFromCustomers")}</h2>
        <table>
          <thead><tr><th>{t("customerCol")}</th><th>{t("dueCol")}</th></tr></thead>
          <tbody>
            {r.customerDues.map((c) => <tr key={c.id}><td>{c.name}</td><td>Rs. {digits(c.dueAmount.toFixed(2))}</td></tr>)}
            {!r.customerDues.length && <tr><td colSpan={2}>{t("noOutstandingDues")}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>{t("lowStockSection")}</h2>
        <table>
          <thead><tr><th>{t("medicine")}</th><th>{t("batch")}</th><th>{t("qty")}</th><th>{t("minCol")}</th></tr></thead>
          <tbody>{r.lowStock.map((b, i) => <tr key={i}><td>{b.medicine}</td><td>{b.batch}</td><td>{digits(b.quantity)}</td><td>{digits(b.minStock)}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="panel">
        <h2>{t("expiredExpiringSoonSection")}</h2>
        <table>
          <thead><tr><th>{t("medicine")}</th><th>{t("batch")}</th><th>{t("qty")}</th><th>{t("expiry")}</th><th>{t("status")}</th></tr></thead>
          <tbody>
            {r.expired.map((b, i) => <tr key={"e"+i}><td>{b.medicine}</td><td>{b.batch}</td><td>{digits(b.quantity)}</td><td>{formatDate(b.expiryDate)}</td><td>{t("expiredStatus")}</td></tr>)}
            {r.expiringSoon.map((b, i) => <tr key={"s"+i}><td>{b.medicine}</td><td>{b.batch}</td><td>{digits(b.quantity)}</td><td>{formatDate(b.expiryDate)}</td><td>{t("soonStatus")}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
