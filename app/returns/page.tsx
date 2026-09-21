"use client";
import { useEffect, useState } from "react";

type SaleItem = { id: number; quantity: number; sellingRate: number; medicine: { name: string }; batch: { batchNumber: string } };
type Sale = { id: number; invoiceNo: string; items: SaleItem[] };
type ReturnRow = {
  id: number; returnDate: string; totalAmount: number; reason?: string | null;
  sale: { invoiceNo: string };
  items: { quantity: number; amount: number; saleItem: { medicine: { name: string } } }[];
};

export default function ReturnsPage() {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [qtys, setQtys] = useState<Record<number, string>>({});
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<ReturnRow[]>([]);

  const load = () => fetch("/api/returns").then((r) => r.json()).then(setRows);
  useEffect(() => {
    load();
  }, []);

  async function lookup() {
    setMsg("");
    setSale(null);
    const r = await fetch(`/api/sales/${encodeURIComponent(invoiceNo)}`);
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Invoice not found");
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
      setMsg("Enter a return quantity for at least one item");
      return;
    }
    const r = await fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceNo: sale.invoiceNo, items, reason }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Return failed");
      return;
    }
    setMsg("✅ Return processed and stock restored");
    setSale(null);
    setInvoiceNo("");
    setReason("");
    load();
  }

  return (
    <section>
      <h1>Returns</h1>
      <div className="panel">
        <h2>Process a return</h2>
        <div className="grid" style={{ gridTemplateColumns: "3fr 1fr" }}>
          <input placeholder="Invoice number, e.g. INV-00001" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          <button onClick={lookup}>Find invoice</button>
        </div>
        {msg && <p className="notice">{msg}</p>}
        {sale && (
          <>
            <table>
              <thead>
                <tr><th>Medicine</th><th>Batch</th><th>Sold qty</th><th>Return qty</th></tr>
              </thead>
              <tbody>
                {sale.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.medicine.name}</td>
                    <td>{it.batch.batchNumber}</td>
                    <td>{it.quantity}</td>
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
            <input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button onClick={submitReturn}>Process Return</button>
          </>
        )}
      </div>
      <div className="panel">
        <h2>Recent returns</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Invoice</th><th>Items</th><th>Amount</th><th>Reason</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.returnDate).toLocaleString()}</td>
                <td>{r.sale.invoiceNo}</td>
                <td>{r.items.map((it) => `${it.saleItem.medicine.name} ×${it.quantity}`).join(", ")}</td>
                <td>Rs. {r.totalAmount.toFixed(2)}</td>
                <td>{r.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
