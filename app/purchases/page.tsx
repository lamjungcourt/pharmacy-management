"use client";
import { useEffect, useState } from "react";

type Medicine = { id: number; name: string; sku: string };
type Supplier = { id: number; name: string; dueAmount: number };
type Line = { medicineId: string; batchNumber: string; quantity: string; purchaseRate: string; sellingRate: string; expiryDate: string };
type PurchaseItem = { id: number; quantity: number; purchaseRate: number; medicine: { name: string }; batch: { batchNumber: string } };
type Purchase = {
  id: number;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  supplier?: { id: number; name: string } | null;
  items: PurchaseItem[];
};

const emptyLine = (): Line => ({ medicineId: "", batchNumber: "", quantity: "", purchaseRate: "", sellingRate: "", expiryDate: "" });

export default function PurchasesPage() {
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [paidAmount, setPaidAmount] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/purchases").then((r) => r.json()).then(setPurchases);
  const loadSuppliers = () => fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);

  useEffect(() => {
    fetch("/api/medicines").then((r) => r.json()).then((m) => setMeds(m.map((x: any) => ({ id: x.id, name: x.name, sku: x.sku }))));
    loadSuppliers();
    load();
  }, []);

  function updateLine(i: number, patch: Partial<Line>) {
    const next = [...lines];
    next[i] = { ...next[i], ...patch };
    setLines(next);
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.purchaseRate) || 0), 0);
  const due = Math.max(0, total - (Number(paidAmount) || 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const items = lines.filter((l) => l.medicineId && l.batchNumber && l.quantity && l.expiryDate);
    if (!items.length) {
      setMsg("Add at least one complete line item");
      return;
    }
    const r = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: supplierId || undefined,
        paidAmount: paidAmount || 0,
        items: items.map((l) => ({
          medicineId: l.medicineId,
          batchNumber: l.batchNumber,
          quantity: l.quantity,
          purchaseRate: l.purchaseRate || 0,
          sellingRate: l.sellingRate || l.purchaseRate || 0,
          expiryDate: l.expiryDate,
        })),
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Purchase failed");
      return;
    }
    setMsg("✅ Purchase recorded and stock updated");
    setLines([emptyLine()]);
    setPaidAmount("");
    load();
    loadSuppliers();
  }

  return (
    <section>
      <h1>Purchases (Stock In)</h1>
      <div className="panel">
        <h2>Record a purchase</h2>
        <form onSubmit={submit}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label>
              Supplier (Party)
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— None —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.dueAmount ? ` (Due Rs. ${s.dueAmount.toFixed(2)})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cash Paid Now (Rs.)
              <input
                type="number"
                min="0"
                placeholder="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </label>
          </div>
          <table>
            <thead>
              <tr><th>Medicine</th><th>Batch #</th><th>Qty</th><th>Buy rate</th><th>Sell rate</th><th>Expiry</th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select value={l.medicineId} onChange={(e) => updateLine(i, { medicineId: e.target.value })}>
                      <option value="">Select…</option>
                      {meds.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                      ))}
                    </select>
                  </td>
                  <td><input value={l.batchNumber} onChange={(e) => updateLine(i, { batchNumber: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.purchaseRate} onChange={(e) => updateLine(i, { purchaseRate: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.sellingRate} onChange={(e) => updateLine(i, { sellingRate: e.target.value })} /></td>
                  <td><input type="date" value={l.expiryDate} onChange={(e) => updateLine(i, { expiryDate: e.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Bill total: <b>Rs. {total.toFixed(2)}</b> · Paid now: <b>Rs. {(Number(paidAmount) || 0).toFixed(2)}</b> ·{" "}
            {supplierId ? <span>Will add to Party due: <b>Rs. {due.toFixed(2)}</b></span> : <span>Select a supplier to track due</span>}
          </p>
          <div className="formActions">
            <button type="button" className="ghost" onClick={() => setLines([...lines, emptyLine()])}>+ Add line</button>
            <button type="submit">Save Purchase</button>
          </div>
          {msg && <p className="notice">{msg}</p>}
        </form>
      </div>
      <div className="panel">
        <h2>Recent purchases</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Supplier (Party)</th><th>Items</th><th>Total</th><th>Paid</th><th>Due</th></tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.purchaseDate).toLocaleString()}</td>
                <td>{p.supplier?.name ?? "—"}</td>
                <td>{p.items.map((it) => `${it.medicine.name} (${it.batch.batchNumber}) ×${it.quantity}`).join(", ")}</td>
                <td>Rs. {p.totalAmount.toFixed(2)}</td>
                <td>Rs. {p.paidAmount.toFixed(2)}</td>
                <td>{p.totalAmount - p.paidAmount > 0 ? <b style={{ color: "#c0392b" }}>Rs. {(p.totalAmount - p.paidAmount).toFixed(2)}</b> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
