"use client";
import { useEffect, useState, use } from "react";
import { useLanguage } from "@/lib/i18n";

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
  customer?: { name: string; phone?: string; address?: string } | null;
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
  const { t, digits, formatDate } = useLanguage();
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
  if (!sale || !settings) return <section><p>{t("loading")}</p></section>;

  return (
    <section className="invoiceWrap">
      <div className="noprint invoiceToolbar">
        <button onClick={() => window.print()}>🖨️ {t("print")}</button>
        <button className="ghost" onClick={() => window.close()}>{t("close")}</button>
      </div>
      <div className="invoice">
        <header className="invoiceHead">
          <div>
            {settings.logoUrl && <img className="invoiceLogo" src={settings.logoUrl} alt={settings.name} />}
            <h1>{settings.name}</h1>
            {settings.address && <p>{settings.address}</p>}
            {settings.phone && <p>{t("tel")}: {digits(settings.phone)}</p>}
            {settings.email && <p>{t("email")}: {settings.email}</p>}
            {settings.panVat && <p>PAN/VAT: {digits(settings.panVat)}</p>}
            {settings.regNo && <p>{t("regNoLabel")}: {digits(settings.regNo)}</p>}
          </div>
          <div className="invoiceMeta">
            <h2>{t("invoice")}</h2>
            <p><b>{t("invoiceNoLabel")}:</b> {sale.invoiceNo}</p>
            <p><b>{t("dateLabel")}:</b> {formatDate(sale.saleDate, true)}</p>
            <p><b>{t("cashierLabel")}:</b> {sale.cashier.name}</p>
            {sale.customer && <p><b>{t("customerLabel")}:</b> {sale.customer.name}{sale.customer.phone ? ` (${digits(sale.customer.phone)})` : ""}</p>}
            {sale.customer?.address && <p><b>{t("address")}:</b> {sale.customer.address}</p>}
          </div>
        </header>
        <table>
          <thead>
            <tr>
              <th>{t("medicine")}</th>
              <th>{t("batch")}</th>
              <th>{t("expiry")}</th>
              <th>{t("qty")}</th>
              <th>{t("rate")}</th>
              <th>{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id}>
                <td>{it.medicine.name}</td>
                <td>{it.batch.batchNumber}</td>
                <td>{formatDate(it.batch.expiryDate)}</td>
                <td>{digits(it.quantity)}</td>
                <td>{digits(it.sellingRate.toFixed(2))}</td>
                <td>{digits(it.amount.toFixed(2))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="invoiceTotals">
          <p>{t("subtotal")}: Rs. {digits(sale.subtotal.toFixed(2))}</p>
          <p>{t("discount")}: Rs. {digits(sale.discount.toFixed(2))}</p>
          <p>{t("vat")}: Rs. {digits(sale.tax.toFixed(2))}</p>
          <h2>{t("total")}: Rs. {digits(sale.total.toFixed(2))}</h2>
          <p>{t("paidLabel")} ({sale.paymentMethod}): Rs. {digits(sale.paid.toFixed(2))}</p>
          <p>{t("changeLabel")}: Rs. {digits(sale.change.toFixed(2))}</p>
        </div>
        <p className="invoiceFooter">{t("thankYouNote")}</p>
      </div>
    </section>
  );
}
