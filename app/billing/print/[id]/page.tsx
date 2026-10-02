"use client";
import { useEffect, useState, use } from "react";

type SaleItem = {
  id: number;
  quantity: number;
  sellingRate: number;
  amount: number;
  medicine: { name: string; sku: string };
  batch: { batchNumber: string; expiryDate: string };
};
type Sale = {
  invoiceNo: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  customer?: { name: string; phone?: string } | null;
  cashier: { name: string };
  items: SaleItem[];
};
type Settings = {
  name: string;
  address?: string;
  phone?: string;
  panVat?: string;
  regNo?: string;
  email?: string;
  logoUrl?: string;
  vatRate: number;
};

export default function PrintInvoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load invoice");
        return j;
      })
      .then((j) => {
        setSale(j.sale);
        setSettings(j.settings);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (sale) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [sale]);

  if (error) return <section><p className="notice error">{error}</p></section>;
  if (!sale || !settings) return <section><p>Loading invoice…</p></section>;

  return (
    <section className="invoiceWrap">
      <div className="noprint invoiceToolbar">
        <button onClick={() => window.print()}>🖨️ Print</button>
        <button className="ghost" onClick={() => window.close()}>Close</button>
      </div>
      <div className="invoice">
        <header className="invoiceHead">
          <div>
            {settings.logoUrl && <img className="invoiceLogo" src={settings.logoUrl} alt={settings.name} />}
            <h1>{settings.name}</h1>
            {settings.address && <p>{settings.address}</p>}
            {settings.phone && <p>Tel: {settings.phone}</p>}
            {settings.email && <p>Email: {settings.email}</p>}
            {settings.panVat && <p>PAN/VAT: {settings.panVat}</p>}
            {settings.regNo && <p>Reg. No: {settings.regNo}</p>}
          </div>
          <div className="invoiceMeta">
            <h2>Invoice</h2>
            <p><b>No:</b> {sale.invoiceNo}</p>
            <p><b>Date:</b> {new Date(sale.saleDate).toLocaleString()}</p>
            <p><b>Cashier:</b> {sale.cashier.name}</p>
            {sale.customer && <p><b>Customer:</b> {sale.customer.name}{sale.customer.phone ? ` (${sale.customer.phone})` : ""}</p>}
          </div>
        </header>
        <table>
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id}>
                <td>{it.medicine.name}</td>
                <td>{it.batch.batchNumber}</td>
                <td>{new Date(it.batch.expiryDate).toLocaleDateString()}</td>
                <td>{it.quantity}</td>
                <td>{it.sellingRate.toFixed(2)}</td>
                <td>{it.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="invoiceTotals">
          <p>Subtotal: Rs. {sale.subtotal.toFixed(2)}</p>
          <p>Discount: Rs. {sale.discount.toFixed(2)}</p>
          <p>VAT: Rs. {sale.tax.toFixed(2)}</p>
          <h2>Total: Rs. {sale.total.toFixed(2)}</h2>
          <p>Paid ({sale.paymentMethod}): Rs. {sale.paid.toFixed(2)}</p>
          <p>Change: Rs. {sale.change.toFixed(2)}</p>
        </div>
        <p className="invoiceFooter">Thank you for your purchase. Please retain this receipt.</p>
      </div>
    </section>
  );
}
