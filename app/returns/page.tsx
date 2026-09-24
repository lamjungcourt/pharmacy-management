"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { usePermissions } from "@/components/PermissionsProvider";

type SaleItem = { id: number; quantity: number; sellingRate: number; medicine: { name: string }; batch: { batchNumber: string } };
type Sale = { id: number; invoiceNo: string; items: SaleItem[] };
type ReturnRow = {
  id: number; returnDate: string; totalAmount: number; reason?: string | null;
  sale: { invoiceNo: string };
  items: { quantity: number; amount: number; saleItem: { medicine: { name: string } } }[];
};

export default function ReturnsPage() {
  const { t, digits, formatDate } = useLanguage();
  const { can } = usePermissions();
  const [invoiceNo, setInvoiceNo] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [qtys, setQtys] = useState<Record<number, string>>({});
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<ReturnRow[]>([]);

  const load = () => fetch("/api/returns").then((r) => (r.ok ? r.json() : [])).then(setRows);
  useEffect(() => {
    load();
  }, []);

  async function lookup() {
    setMsg("");
    setSale(null);
    const r = await fetch(`/api/sales/${encodeURIComponent(invoiceNo)}`);
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("invoiceNotFound"));
      return;
    }
    setSale(j.sale);
    setQtys({});
  }

  async function submitReturn() {
    if (!sale) return;
    const items = Object.entries(qtys)
      .filter(([, v]) => Number(v) > 0)
      .map(([saleItemId, quantity]) => ({ saleItemId: Number(saleItemId), quantity: Number(quantity) }));
    if (!items.length) {
      setMsg(t("enterReturnQtyForOne"));
      return;
    }
    const r = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceNo: sale.invoiceNo, items, reason }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("returnFailed"));
      return;
    }
    setMsg(t("returnProcessed"));
    setSale(null);
    setInvoiceNo("");
    setReason("");
    load();
  }

  return (
    <section>
      <h1>{t("returnsTitle")}</h1>
      {can("returns", "add") && (
      <div className="panel">
        <h2>{t("processAReturn")}</h2>
        <div className="grid" style={{ gridTemplateColumns: "3fr 1fr" }}>
          <input placeholder={t("invoiceNumberPlaceholder")} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          <button onClick={lookup}>{t("findInvoice")}</button>
        </div>
        {msg && <p className="notice">{msg}</p>}
        {sale && (
          <>
            <table>
              <thead>
                <tr><th>{t("medicine")}</th><th>{t("batch")}</th><th>{t("soldQty")}</th><th>{t("returnQty")}</th></tr>
              </thead>
              <tbody>
                {sale.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.medicine.name}</td>
                    <td>{it.batch.batchNumber}</td>
                    <td>{digits(it.quantity)}</td>
                    <td>
                      <input
                        className="qty"
                        type="number"
                        min={0}
                        max={it.quantity}
                        value={qtys[it.id] ?? ""}
                        onChange={(e) => setQtys({ ...qtys, [it.id]: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <input placeholder={t("reasonOptional")} value={reason} onChange={(e) => setReason(e.target.value)} />
            <button onClick={submitReturn}>{t("processReturn")}</button>
          </>
        )}
      </div>
      )}
      <div className="panel">
        <h2>{t("recentReturns")}</h2>
        <table>
          <thead>
            <tr><th>{t("dateCol")}</th><th>{t("invoice")}</th><th>{t("itemsColShort")}</th><th>{t("amount")}</th><th>{t("reasonCol")}</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.returnDate, true)}</td>
                <td>{r.sale.invoiceNo}</td>
                <td>{r.items.map((it) => `${it.saleItem.medicine.name} ×${it.quantity}`).join(", ")}</td>
                <td>Rs. {digits(r.totalAmount.toFixed(2))}</td>
                <td>{r.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
