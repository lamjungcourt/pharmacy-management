"use client";
import { useEffect, useState } from "react";

type Sale = {
  id: number; invoiceNo: string; saleDate: string; total: number; paymentMethod: string; cancelled: boolean;
  customer?: { name: string } | null;
  cashier: { name: string };
  items: { id: number }[];
};

export default function SalesHistoryPage() {
  const [rows, setRows] = useState<Sale[]>([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch("/api/sales?" + params.toString()).then((r) => r.json()).then(setRows);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalRevenue = rows.reduce((s, r) => s + (r.cancelled ? 0 : r.total), 0);

  return (
    <section>
      <h1>Sales History</h1>
      <div className="panel">
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
          <input placeholder="Search invoice # or customer" value={q} onChange={(e) => setQ(e.target.value)} />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={load}>Search</button>
        </div>
        <p className="notice">{rows.length} bill(s) · Total: Rs. {totalRevenue.toFixed(2)}</p>
        <table>
          <thead>
            <tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Cashier</th><th>Items</th><th>Total</th><th>Payment</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} style={s.cancelled ? { opacity: 0.5 } : undefined}>
                <td>{s.invoiceNo}</td>
                <td>{new Date(s.saleDate).toLocaleString()}</td>
                <td>{s.customer?.name ?? "Walk-in"}</td>
                <td>{s.cashier.name}</td>
                <td>{s.items.length}</td>
                <td>Rs. {s.total.toFixed(2)}</td>
                <td>{s.paymentMethod}{s.cancelled ? " (cancelled)" : ""}</td>
                <td>
                  <a className="ghost printLink" href={`/billing/print/${s.id}`} target="_blank" rel="noreferrer">🖨️ Print</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
