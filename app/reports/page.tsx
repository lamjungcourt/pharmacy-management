"use client";
import { useEffect, useState } from "react";

type PeriodRow = { period: string; bills?: number; revenue?: number; profit?: number; count?: number; amount?: number; paid?: number; due?: number };
type Report = {
  groupBy: "day" | "month";
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
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");
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

  if (!r) return <section><h1>Reports</h1><p>Loading…</p></section>;

  const maxRevenue = Math.max(1, ...r.topMedicines.map((m) => m.revenue));
  const maxSales = Math.max(1, ...r.salesByPeriod.map((p) => p.revenue || 0));
  const maxPurchase = Math.max(1, ...r.purchasesByPeriod.map((p) => p.amount || 0));

  return (
    <section>
      <h1>Reports</h1>
      <div className="panel">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button className={groupBy === "day" ? "" : "ghost"} onClick={() => setGroupBy("day")}>Daily</button>
          <button className={groupBy === "month" ? "" : "ghost"} onClick={() => setGroupBy("month")}>Monthly</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <button onClick={load}>Apply</button>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Sales Report</h2>
      <div className="cards">
        <div className="card"><span>🧾</span><small>Bills</small><strong>{r.summary.billCount}</strong></div>
        <div className="card"><span>💰</span><small>Revenue</small><strong>Rs. {r.summary.totalRevenue.toFixed(2)}</strong></div>
        <div className="card"><span>💵</span><small>Profit</small><strong>Rs. {r.summary.totalProfit.toFixed(2)}</strong></div>
        <div className="card"><span>🏷️</span><small>Discounts</small><strong>Rs. {r.summary.totalDiscount.toFixed(2)}</strong></div>
      </div>
      <div className="panel">
        <h3>{groupBy === "day" ? "Daily" : "Monthly"} sales</h3>
        <div className="barChart">
          {r.salesByPeriod.map((p) => (
            <div className="barRow" key={p.period}>
              <span className="barLabel">{p.period}</span>
              <div className="barTrack"><div className="barFill" style={{ width: `${((p.revenue || 0) / maxSales) * 100}%` }} /></div>
              <span className="barValue">Rs. {(p.revenue || 0).toFixed(0)} ({p.bills} bills)</span>
            </div>
          ))}
          {!r.salesByPeriod.length && <p>No sales in this period.</p>}
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Purchase Report</h2>
      <div className="cards">
        <div className="card"><span>🛒</span><small>Purchases</small><strong>{r.summary.purchaseCount}</strong></div>
        <div className="card"><span>💰</span><small>Purchase Amount</small><strong>Rs. {r.summary.totalPurchaseAmount.toFixed(2)}</strong></div>
        <div className="card"><span>✅</span><small>Cash Paid</small><strong>Rs. {r.summary.totalPurchasePaid.toFixed(2)}</strong></div>
        <div className="card"><span>📥</span><small>Due to Suppliers</small><strong>Rs. {r.summary.totalPurchaseDue.toFixed(2)}</strong></div>
        <div className="card"><span>↪️</span><small>Purchase Returns</small><strong>Rs. {r.summary.totalPurchaseReturned.toFixed(2)}</strong></div>
      </div>
      <div className="panel">
        <h3>{groupBy === "day" ? "Daily" : "Monthly"} purchases</h3>
        <div className="barChart">
          {r.purchasesByPeriod.map((p) => (
            <div className="barRow" key={p.period}>
              <span className="barLabel">{p.period}</span>
              <div className="barTrack"><div className="barFill" style={{ width: `${((p.amount || 0) / maxPurchase) * 100}%` }} /></div>
              <span className="barValue">Rs. {(p.amount || 0).toFixed(0)} (paid Rs. {(p.paid || 0).toFixed(0)}, due Rs. {(p.due || 0).toFixed(0)})</span>
            </div>
          ))}
          {!r.purchasesByPeriod.length && <p>No purchases in this period.</p>}
        </div>
      </div>

      <div className="panel">
        <h2>Top selling medicines</h2>
        <div className="barChart">
          {r.topMedicines.map((m) => (
            <div className="barRow" key={m.name}>
              <span className="barLabel">{m.name}</span>
              <div className="barTrack"><div className="barFill" style={{ width: `${(m.revenue / maxRevenue) * 100}%` }} /></div>
              <span className="barValue">Rs. {m.revenue.toFixed(0)} ({m.quantity} units)</span>
            </div>
          ))}
          {!r.topMedicines.length && <p>No sales in this period.</p>}
        </div>
      </div>

      <div className="panel">
        <h2>📥 Amount Due to Suppliers (Party)</h2>
        <table>
          <thead><tr><th>Supplier</th><th>Due</th></tr></thead>
          <tbody>
            {r.supplierDues.map((s) => <tr key={s.id}><td>{s.name}</td><td>Rs. {s.dueAmount.toFixed(2)}</td></tr>)}
            {!r.supplierDues.length && <tr><td colSpan={2}>No outstanding dues.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>📤 Amount Due from Customers</h2>
        <table>
          <thead><tr><th>Customer</th><th>Due</th></tr></thead>
          <tbody>
            {r.customerDues.map((c) => <tr key={c.id}><td>{c.name}</td><td>Rs. {c.dueAmount.toFixed(2)}</td></tr>)}
            {!r.customerDues.length && <tr><td colSpan={2}>No outstanding dues.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>⚠️ Low stock</h2>
        <table>
          <thead><tr><th>Medicine</th><th>Batch</th><th>Qty</th><th>Min</th></tr></thead>
          <tbody>{r.lowStock.map((b, i) => <tr key={i}><td>{b.medicine}</td><td>{b.batch}</td><td>{b.quantity}</td><td>{b.minStock}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="panel">
        <h2>🔴 Expired / 🟠 Expiring soon</h2>
        <table>
          <thead><tr><th>Medicine</th><th>Batch</th><th>Qty</th><th>Expiry</th><th>Status</th></tr></thead>
          <tbody>
            {r.expired.map((b, i) => <tr key={"e"+i}><td>{b.medicine}</td><td>{b.batch}</td><td>{b.quantity}</td><td>{new Date(b.expiryDate).toLocaleDateString()}</td><td>🔴 Expired</td></tr>)}
            {r.expiringSoon.map((b, i) => <tr key={"s"+i}><td>{b.medicine}</td><td>{b.batch}</td><td>{b.quantity}</td><td>{new Date(b.expiryDate).toLocaleDateString()}</td><td>🟠 Soon</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
