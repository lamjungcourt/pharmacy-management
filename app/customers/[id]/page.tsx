"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load customer");
        return j;
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <section><p className="notice error">{error}</p></section>;
  if (!data) return <section><p>Loading…</p></section>;

  const { customer, sales, returns, payments, summary } = data;

  return (
    <section>
      <p><Link href="/customers">← Customers</Link></p>
      <h1>{customer.name} {!customer.isActive && <span className="notice error" style={{ padding: "2px 8px", fontSize: 12 }}>Archived</span>}</h1>

      <div className="panel">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <p><b>Phone:</b> {customer.phone || "—"}</p>
          <p><b>Email:</b> {customer.email || "—"}</p>
          <p><b>Address:</b> {customer.address || "—"}</p>
          <p><b>PAN/VAT:</b> {customer.panVat || "—"}</p>
          <p><b>Opening balance:</b> Rs. {customer.openingBalance.toFixed(2)}</p>
          <p><b>Outstanding balance:</b> <b style={{ color: customer.dueAmount > 0 ? "#c0392b" : "#27ae60" }}>Rs. {customer.dueAmount.toFixed(2)}</b></p>
        </div>
      </div>

      <div className="cards">
        <div className="card"><span>🧾</span><small>Total Sales</small><strong>Rs. {summary.totalSales.toFixed(2)}</strong></div>
        <div className="card"><span>💵</span><small>Total Paid</small><strong>Rs. {summary.totalPaid.toFixed(2)}</strong></div>
        <div className="card"><span>📤</span><small>Outstanding</small><strong>Rs. {summary.outstanding.toFixed(2)}</strong></div>
      </div>

      <div className="panel">
        <h2>Sales history</h2>
        <table>
          <thead><tr><th>Date</th><th>Invoice</th><th>Medicines</th><th>Total</th><th>Paid</th></tr></thead>
          <tbody>
            {sales.map((s: any) => (
              <tr key={s.id}>
                <td>{new Date(s.saleDate).toLocaleDateString()}</td>
                <td><Link href={`/billing/print/${s.id}`}>{s.invoiceNo}</Link></td>
                <td>{s.items.map((it: any) => `${it.medicine.name} (${it.batch.batchNumber}) ×${it.quantity}`).join(", ")}</td>
                <td>Rs. {s.total.toFixed(2)}</td>
                <td>Rs. {s.paid.toFixed(2)}</td>
              </tr>
            ))}
            {!sales.length && <tr><td colSpan={5}>No sales recorded for this customer yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Returns</h2>
        <table>
          <thead><tr><th>Date</th><th>Invoice</th><th>Medicines</th><th>Amount</th></tr></thead>
          <tbody>
            {returns.map((r: any) => (
              <tr key={r.id}>
                <td>{new Date(r.returnDate).toLocaleDateString()}</td>
                <td>{r.sale.invoiceNo}</td>
                <td>{r.items.map((it: any) => `${it.saleItem.medicine.name} ×${it.quantity}`).join(", ")}</td>
                <td>Rs. {r.totalAmount.toFixed(2)}</td>
              </tr>
            ))}
            {!returns.length && <tr><td colSpan={4}>No returns recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Payments</h2>
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Note</th></tr></thead>
          <tbody>
            {payments.map((p: any) => (
              <tr key={p.id}><td>{new Date(p.paidDate).toLocaleString()}</td><td>Rs. {p.amount.toFixed(2)}</td><td>{p.note ?? "—"}</td></tr>
            ))}
            {!payments.length && <tr><td colSpan={3}>No payments recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
