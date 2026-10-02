"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";

type Item = {
  id: number; quantity: number; freeQuantity: number; purchaseRate: number; sellingRate: number;
  discount: number; vat: number; amount: number;
  medicine: { name: string; genericName?: string | null };
  batch: { batchNumber: string; expiryDate: string };
};
type Purchase = {
  id: number; invoiceNo?: string | null; purchaseDate: string; status: string;
  subtotal: number; discountAmount: number; vatAmount: number; totalAmount: number; paidAmount: number;
  paymentType: "CASH" | "CREDIT"; paidDate?: string | null; creditDueDate?: string | null;
  invoiceFileUrl?: string | null; invoiceFileName?: string | null;
  supplier?: { id: number; name: string; address?: string; phone?: string; email?: string; panVat?: string; pan?: string; vatNo?: string } | null;
  createdBy?: { name: string } | null;
  items: Item[];
};
type Settings = { name: string; address?: string; phone?: string; panVat?: string; regNo?: string; email?: string; logoUrl?: string };

export default function PurchaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/purchases/${id}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load purchase");
        return j;
      })
      .then((j) => { setPurchase(j.purchase); setSettings(j.settings); })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <section><p className="notice error">{error}</p></section>;
  if (!purchase || !settings) return <section><p>Loading…</p></section>;

  const due = purchase.totalAmount - purchase.paidAmount;

  return (
    <section className="invoiceWrap">
      <div className="noprint invoiceToolbar">
        <Link href="/purchases" className="ghost" style={{ padding: "9px 14px", borderRadius: 8, textDecoration: "none" }}>← Purchases</Link>
        <button onClick={() => window.print()}>🖨️ Print</button>
      </div>
      <div className="invoice">
        <header className="invoiceHead">
          <div>
            {settings.logoUrl && <img className="invoiceLogo" src={settings.logoUrl} alt={settings.name} />}
            <h1>{settings.name}</h1>
            {settings.address && <p>{settings.address}</p>}
            {settings.phone && <p>Tel: {settings.phone}</p>}
            {settings.panVat && <p>PAN/VAT: {settings.panVat}</p>}
          </div>
          <div className="invoiceMeta">
            <h2>Purchase Invoice</h2>
            <p><b>Invoice No:</b> {purchase.invoiceNo ?? `#${purchase.id}`}</p>
            <p><b>Purchase ID:</b> {purchase.id}</p>
            <p><b>Date:</b> {new Date(purchase.purchaseDate).toLocaleString()}</p>
            <p><b>Payment:</b> {purchase.paymentType === "CASH" ? "Cash" : "Credit"}
              {purchase.paymentType === "CASH" && purchase.paidDate ? ` — paid ${new Date(purchase.paidDate).toLocaleDateString()}` : ""}
              {purchase.paymentType === "CREDIT" && purchase.creditDueDate ? ` — due ${new Date(purchase.creditDueDate).toLocaleDateString()}` : ""}
            </p>
            <p><b>Status:</b> {purchase.status} {due > 0 ? "(Due)" : "(Paid)"}</p>
            {purchase.createdBy && <p><b>Recorded by:</b> {purchase.createdBy.name}</p>}
          </div>
        </header>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: "0 0 6px" }}>Supplier</h3>
            {purchase.supplier ? (
              <>
                <p style={{ margin: "2px 0" }}><Link href={`/suppliers/${purchase.supplier.id}`}>{purchase.supplier.name}</Link></p>
                {purchase.supplier.address && <p style={{ margin: "2px 0" }}>{purchase.supplier.address}</p>}
                {purchase.supplier.phone && <p style={{ margin: "2px 0" }}>Tel: {purchase.supplier.phone}</p>}
                {(purchase.supplier.pan || purchase.supplier.panVat) && <p style={{ margin: "2px 0" }}>PAN: {purchase.supplier.pan || purchase.supplier.panVat}</p>}
                {purchase.supplier.vatNo && <p style={{ margin: "2px 0" }}>VAT No: {purchase.supplier.vatNo}</p>}
              </>
            ) : <p>—</p>}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>SN</th><th>Medicine</th><th>Generic</th><th>Batch</th><th>Expiry</th>
              <th>Qty</th><th>Free</th><th>Rate</th><th>Discount</th><th>VAT</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((it, i) => (
              <tr key={it.id}>
                <td>{i + 1}</td>
                <td>{it.medicine.name}</td>
                <td>{it.medicine.genericName ?? "—"}</td>
                <td>{it.batch.batchNumber}</td>
                <td>{new Date(it.batch.expiryDate).toLocaleDateString()}</td>
                <td>{it.quantity}</td>
                <td>{it.freeQuantity || "—"}</td>
                <td>{it.purchaseRate.toFixed(2)}</td>
                <td>{it.discount.toFixed(2)}</td>
                <td>{it.vat.toFixed(2)}</td>
                <td>{it.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoiceTotals">
          <p>Subtotal: Rs. {purchase.subtotal.toFixed(2)}</p>
          <p>Discount: Rs. {purchase.discountAmount.toFixed(2)}</p>
          <p>VAT: Rs. {purchase.vatAmount.toFixed(2)}</p>
          <h2>Net Total: Rs. {purchase.totalAmount.toFixed(2)}</h2>
          <p>Paid: Rs. {purchase.paidAmount.toFixed(2)}</p>
          <p>Due: Rs. {due.toFixed(2)}</p>
        </div>
        <p className="invoiceFooter">Internal purchase record — not a document issued to the supplier.</p>
        {purchase.invoiceFileUrl && (
          <div className="noprint" style={{ marginTop: 18, borderTop: "1px dashed #ccc", paddingTop: 14 }}>
            <h3 style={{ margin: "0 0 8px" }}>📎 Attached vendor invoice{purchase.invoiceFileName ? `: ${purchase.invoiceFileName}` : ""}</h3>
            {purchase.invoiceFileUrl.startsWith("data:image") ? (
              <a href={purchase.invoiceFileUrl} target="_blank" rel="noreferrer">
                <img src={purchase.invoiceFileUrl} alt="Attached invoice" style={{ maxWidth: 320, borderRadius: 8, border: "1px solid #ddd" }} />
              </a>
            ) : (
              <a href={purchase.invoiceFileUrl} target="_blank" rel="noreferrer">Open attached file</a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
