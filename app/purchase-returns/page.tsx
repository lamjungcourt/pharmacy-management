"use client";
import { useEffect, useMemo, useState } from "react";

type Batch = { id: number; batchNumber: string; quantity: number; purchaseRate: number; supplier?: { id: number; name: string } | null };
type Medicine = { id: number; name: string; sku: string; batches: Batch[] };
type Supplier = { id: number; name: string };
type Line = { medicineId: string; batchId: string; quantity: string };
type ReturnItem = { id: number; quantity: number; purchaseRate: number; amount: number; medicine: { name: string }; batch: { batchNumber: string } };
type PurchaseReturn = { id: number; returnDate: string; reason?: string; totalAmount: number; supplier?: { name: string } | null; items: ReturnItem[] };

const emptyLine = (): Line => ({ medicineId: "", batchId: "", quantity: "" });

export default function PurchaseReturnsPage() {
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/purchase-returns").then((r) => r.json()).then(setReturns);

  useEffect(() => {
    fetch("/api/medicines").then((r) => r.json()).then(setMeds);
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
    load();
  }, []);

  // Only offer batches that have stock, optionally filtered to the chosen supplier ("party").
  const medicinesForSupplier = useMemo(() => {
    return meds
      .map((m) => ({
        ...m,
        batches: m.batches.filter((b) => b.quantity > 0 && (!supplierId || b.supplier?.id === Number(supplierId))),
      }))
      .filter((m) => m.batches.length > 0);
  }, [meds, supplierId]);

  function updateLine(i: number, patch: Partial<Line>) {
    const next = [...lines];
    next[i] = { ...next[i], ...patch };
    setLines(next);
  }

  function batchesFor(medicineId: string): Batch[] {
    const m = medicinesForSupplier.find((x) => String(x.id) === medicineId);
    return m ? m.batches : [];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const items = lines.filter((l) => l.medicineId && l.batchId && l.quantity);
    if (!items.length) {
      setMsg("Add at least one item to return");
      return;
    }
    const r = await fetch("/api/purchase-returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: supplierId || undefined,
        reason: reason || undefined,
        items: items.map((l) => ({ medicineId: Number(l.medicineId), batchId: Number(l.batchId), quantity: Number(l.quantity) })),
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Return failed");
      return;
    }
    setMsg("✅ Return recorded, stock reduced, and supplier due adjusted");
    setLines([emptyLine()]);
    setReason("");
    fetch("/api/medicines").then((res) => res.json()).then(setMeds);
    load();
  }

  return (
    <section>
      <h1>Purchase Returns (to Supplier)</h1>
      <div className="panel">
        <h2>Return stock to supplier</h2>
        <form onSubmit={submit}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label>
              Supplier (Party) — optional filter
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— Any —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <input placeholder="e.g. Damaged, wrong item, near expiry" value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          </div>
          <table>
            <thead>
              <tr><th>Medicine</th><th>Batch</th><th>Available</th><th>Return Qty</th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const batches = batchesFor(l.medicineId);
                const chosen = batches.find((b) => String(b.id) === l.batchId);
                return (
                  <tr key={i}>
                    <td>
                      <select value={l.medicineId} onChange={(e) => updateLine(i, { medicineId: e.target.value, batchId: "" })}>
                        <option value="">Select…</option>
                        {medicinesForSupplier.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select value={l.batchId} onChange={(e) => updateLine(i, { batchId: e.target.value })} disabled={!l.medicineId}>
                        <option value="">Select…</option>
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} {b.supplier ? `— ${b.supplier.name}` : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{chosen ? chosen.quantity : "—"}</td>
                    <td><input className="qty" type="number" min="1" max={chosen?.quantity} value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="formActions">
            <button type="button" className="ghost" onClick={() => setLines([...lines, emptyLine()])}>+ Add line</button>
            <button type="submit">Save Return</button>
          </div>
          {msg && <p className="notice">{msg}</p>}
        </form>
      </div>
      <div className="panel">
        <h2>Recent purchase returns</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Supplier</th><th>Items</th><th>Reason</th><th>Total</th></tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.returnDate).toLocaleString()}</td>
                <td>{r.supplier?.name ?? "—"}</td>
                <td>{r.items.map((it) => `${it.medicine.name} (${it.batch.batchNumber}) ×${it.quantity}`).join(", ")}</td>
                <td>{r.reason ?? "—"}</td>
                <td>Rs. {r.totalAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
