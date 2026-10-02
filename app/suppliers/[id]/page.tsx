"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function SupplierDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ invoiceNo: "", from: "", to: "" });

  const load = () => {
    const qs = new URLSearchParams();
    if (filters.invoiceNo) qs.set("invoiceNo", filters.invoiceNo);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    fetch(`/api/suppliers/${id}?${qs}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load supplier");
        return j;
      })
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, [id, filters]);

  if (error) return <section><p className="notice error">{error}</p></section>;
  if (!data) return <section><p>Loading…</p></section>;

  const { supplier, purchases, payments, summary } = data;

  return (
    <section>
      <p><Link href="/suppliers">← Suppliers</Link></p>
      <h1>{supplier.name} {!supplier.isActive && <span className="notice error" style={{ padding: "2px 8px", fontSize: 12 }}>Archived</span>}</h1>

      <div className="panel">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <p><b>Company:</b> {supplier.company || "—"}</p>
          <p><b>Contact person:</b> {supplier.contactPerson || "—"}</p>
          <p><b>Phone:</b> {supplier.phone || "—"}</p>
          <p><b>Email:</b> {supplier.email || "—"}</p>
          <p><b>Address:</b> {supplier.address || "—"}</p>
          <p><b>Payment terms:</b> {supplier.paymentTerms || "—"}</p>
          <p><b>PAN:</b> {supplier.pan || supplier.panVat || "—"}</p>
          <p><b>VAT No:</b> {supplier.vatNo || "—"}</p>
          <p><b>Registration No:</b> {supplier.regNo || "—"}</p>
          <p><b>Opening balance:</b> Rs. {supplier.openingBalance.toFixed(2)}</p>
          <p><b>Current balance (due):</b> <b style={{ color: supplier.dueAmount > 0 ? "#c0392b" : "#27ae60" }}>Rs. {supplier.dueAmount.toFixed(2)}</b></p>
        </div>
      </div>

      <div className="cards">
        <div className="card"><span>🛒</span><small>Total Purchased</small><strong>Rs. {summary.totalPurchased.toFixed(2)}</strong></div>
        <div className="card"><span>💵</span><small>Total Paid</small><strong>Rs. {summary.totalPaid.toFixed(2)}</strong></div>
        <div className="card"><span>📥</span><small>Total Due</small><strong>Rs. {summary.totalDue.toFixed(2)}</strong></div>
      </div>

      <div className="panel">
        <h2>Purchase history</h2>
        <p><Link href={`/purchases?supplierId=${supplier.id}`} className="ghost" style={{ padding: "8px 14px", borderRadius: 8, textDecoration: "none", display: "inline-block" }}>🛒 New purchase from this vendor</Link></p>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <input placeholder="Filter by invoice #" value={filters.invoiceNo} onChange={(e) => setFilters({ ...filters, invoiceNo: e.target.value })} />
          <label>From <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
          <label>To <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Invoice</th><th>Medicines</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {purchases.map((p: any) => (
              <tr key={p.id}>
                <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                <td>{p.invoiceNo ?? `#${p.id}`}</td>
                <td>{p.items.map((it: any) => `${it.medicine.name} (${it.batch.batchNumber}) ×${it.quantity}${it.freeQuantity ? `+${it.freeQuantity} free` : ""}`).join(", ")}</td>
                <td>Rs. {p.totalAmount.toFixed(2)}</td>
                <td>Rs. {p.paidAmount.toFixed(2)}</td>
                <td>{p.totalAmount - p.paidAmount > 0 ? <b style={{ color: "#c0392b" }}>Rs. {(p.totalAmount - p.paidAmount).toFixed(2)}</b> : "—"}</td>
                <td>{p.status}</td>
                <td><Link href={`/purchases/${p.id}`}>View / Print</Link></td>
              </tr>
            ))}
            {!purchases.length && <tr><td colSpan={8}>No purchases match these filters.</td></tr>}
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
