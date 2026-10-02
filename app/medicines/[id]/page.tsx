"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function MedicineDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"batches" | "purchases" | "sales" | "stock">("batches");
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const load = () =>
    fetch(`/api/medicines/${id}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load medicine");
        return j;
      })
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((me) => setIsAdmin(me?.role === "ADMIN"));
  }, []);

  if (error) return <section><p className="notice error">{error}</p></section>;
  if (!data) return <section><p>Loading…</p></section>;

  const { medicine, purchaseHistory, salesHistory, stockTransactions } = data;
  const totalStock = medicine.batches.reduce((s: number, b: any) => s + b.quantity, 0);

  return (
    <section>
      <p><Link href="/medicines">← Medicines</Link></p>
      <h1>{medicine.name} {!medicine.isActive && <span className="notice error" style={{ padding: "2px 8px", fontSize: 12 }}>Archived</span>}</h1>
      <div className="panel">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <p><b>Generic:</b> {medicine.genericName || "—"}</p>
          <p><b>Manufacturer:</b> {medicine.manufacturer || "—"}</p>
          <p><b>Category:</b> {medicine.category || "—"}</p>
          <p><b>Form / Strength:</b> {[medicine.dosageForm, medicine.strength].filter(Boolean).join(" · ") || "—"}</p>
          <p><b>SKU:</b> {medicine.sku}</p>
          <p><b>Barcode:</b> {medicine.barcode || "—"}</p>
          <p><b>Unit:</b> {medicine.unit}</p>
          <p><b>Min stock / Reorder level:</b> {medicine.minStock} / {medicine.reorderLevel}</p>
          <p><b>Current total stock:</b> {totalStock}</p>
        </div>
      </div>

      <div className="filterRow">
        <button className={tab === "batches" ? "chip active" : "chip"} onClick={() => setTab("batches")}>Batches</button>
        <button className={tab === "purchases" ? "chip active" : "chip"} onClick={() => setTab("purchases")}>Purchase History / Suppliers</button>
        <button className={tab === "sales" ? "chip active" : "chip"} onClick={() => setTab("sales")}>Sales History</button>
        <button className={tab === "stock" ? "chip active" : "chip"} onClick={() => setTab("stock")}>Stock Transactions</button>
      </div>

      {tab === "batches" && (
        <div className="panel">
          {isAdmin && (
            <p>
              <Link href={`/purchases?medicineId=${medicine.id}`} className="ghost" style={{ padding: "8px 14px", borderRadius: 8, textDecoration: "none", display: "inline-block" }}>
                🛒 Add stock — new purchase from a vendor
              </Link>
            </p>
          )}
          <table>
            <thead>
              <tr><th>Batch</th><th>Expiry</th><th>Qty</th>{isAdmin && <th>Buy</th>}<th>Sell</th><th>Supplier</th></tr>
            </thead>
            <tbody>
              {medicine.batches.map((b: any) => (
                <tr key={b.id}>
                  <td>{b.batchNumber}</td>
                  <td>{new Date(b.expiryDate).toLocaleDateString()}</td>
                  <td>{b.quantity}</td>
                  {isAdmin && <td>{b.purchaseRate}</td>}
                  <td>{b.sellingRate}</td>
                  <td>{b.supplier ? (isAdmin ? <Link href={`/suppliers/${b.supplier.id}`}>{b.supplier.name}</Link> : b.supplier.name) : "—"}</td>
                </tr>
              ))}
              {!medicine.batches.length && <tr><td colSpan={isAdmin ? 6 : 5}>No batches yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "purchases" && (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Supplier</th><th>Invoice</th><th>Batch</th><th>Expiry</th>
                <th>Qty</th><th>Free</th>{isAdmin && <th>Rate</th>}{isAdmin && <th>VAT</th>}{isAdmin && <th>Total</th>}
              </tr>
            </thead>
            <tbody>
              {purchaseHistory.map((p: any) => (
                <tr key={p.id}>
                  <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                  <td>{p.supplier ? (isAdmin ? <Link href={`/suppliers/${p.supplier.id}`}>{p.supplier.name}</Link> : p.supplier.name) : "—"}</td>
                  <td>{isAdmin ? <Link href={`/purchases/${p.purchaseId}`}>{p.invoiceNo ?? `#${p.purchaseId}`}</Link> : (p.invoiceNo ?? `#${p.purchaseId}`)}</td>
                  <td>{p.batch.batchNumber}</td>
                  <td>{new Date(p.batch.expiryDate).toLocaleDateString()}</td>
                  <td>{p.quantity}</td>
                  <td>{p.freeQuantity}</td>
                  {isAdmin && <td>{p.purchaseRate?.toFixed?.(2)}</td>}
                  {isAdmin && <td>{p.vat?.toFixed?.(2)}</td>}
                  {isAdmin && <td>{p.amount?.toFixed?.(2)}</td>}
                </tr>
              ))}
              {!purchaseHistory.length && <tr><td colSpan={9}>No purchases recorded for this medicine yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "sales" && (
        <div className="panel">
          <table>
            <thead>
              <tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Batch</th><th>Qty</th><th>Rate</th><th>Amount</th>{isAdmin && <th>Profit</th>}</tr>
            </thead>
            <tbody>
              {salesHistory.map((s: any) => (
                <tr key={s.id}>
                  <td>{new Date(s.saleDate).toLocaleDateString()}</td>
                  <td><Link href={`/billing/print/${s.saleId}`}>{s.invoiceNo}</Link></td>
                  <td>{s.customer ? <Link href={`/customers/${s.customer.id}`}>{s.customer.name}</Link> : "Walk-in"}</td>
                  <td>{s.batch.batchNumber}</td>
                  <td>{s.quantity}</td>
                  <td>{s.sellingRate.toFixed(2)}</td>
                  <td>{s.amount.toFixed(2)}</td>
                  {isAdmin && <td>{s.profit?.toFixed?.(2)}</td>}
                </tr>
              ))}
              {!salesHistory.length && <tr><td colSpan={8}>No sales recorded for this medicine yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "stock" && (
        <div className="panel">
          <table>
            <thead>
              <tr><th>Date/Time</th><th>Type</th><th>Batch</th><th>In</th><th>Out</th><th>Balance</th><th>Reference</th><th>Party</th><th>User</th></tr>
            </thead>
            <tbody>
              {stockTransactions.map((t: any) => (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{t.type}</td>
                  <td>{t.batch.batchNumber}</td>
                  <td>{t.quantityIn || "—"}</td>
                  <td>{t.quantityOut || "—"}</td>
                  <td>{t.balanceAfter ?? "—"}</td>
                  <td>{t.reference ?? "—"}</td>
                  <td>{t.supplier?.name ?? t.customer?.name ?? "—"}</td>
                  <td>{t.user?.name ?? "—"}</td>
                </tr>
              ))}
              {!stockTransactions.length && <tr><td colSpan={9}>No stock movements recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
