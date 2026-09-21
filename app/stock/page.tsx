"use client";
import { useEffect, useState } from "react";

type Batch = {
  id: number; batchNumber: string; quantity: number; purchaseRate: number; sellingRate: number; expiryDate: string;
  medicine: { id: number; name: string; sku: string; minStock: number };
};

export default function StockPage() {
  const [rows, setRows] = useState<Batch[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expired" | "expiring">("all");
  const [msg, setMsg] = useState("");

  const load = () =>
    fetch("/api/medicines?q=" + encodeURIComponent(q))
      .then((r) => r.json())
      .then((meds) => {
        const batches: Batch[] = meds.flatMap((m: any) =>
          m.batches.map((b: any) => ({ ...b, medicine: { id: m.id, name: m.name, sku: m.sku, minStock: m.minStock } }))
        );
        setRows(batches);
      });

  useEffect(() => {
    load();
  }, [q]);

  const now = new Date();
  const soon = new Date(now.getTime() + 90 * 86400000);
  const visible = rows.filter((b) => {
    if (filter === "low") return b.quantity <= b.medicine.minStock;
    if (filter === "expired") return new Date(b.expiryDate) < now;
    if (filter === "expiring") return new Date(b.expiryDate) >= now && new Date(b.expiryDate) <= soon;
    return true;
  });

  async function adjust(batch: Batch) {
    const input = prompt(`Adjust stock for ${batch.medicine.name} (${batch.batchNumber}).\nCurrent qty: ${batch.quantity}\nEnter change (e.g. -5 or 10):`);
    if (!input) return;
    const delta = Number(input);
    if (!delta) return;
    const reason = prompt("Reason for adjustment (optional):") || undefined;
    const r = await fetch("/api/stock/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: batch.id, delta, reason }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Adjustment failed");
      return;
    }
    setMsg("");
    load();
  }

  return (
    <section>
      <h1>Stock Overview</h1>
      <div className="panel">
        <input placeholder="Search medicine, SKU or batch" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filterRow">
          {(["all", "low", "expired", "expiring"] as const).map((f) => (
            <button key={f} className={filter === f ? "chip active" : "chip"} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "low" ? "⚠️ Low stock" : f === "expired" ? "🔴 Expired" : "🟠 Expiring soon"}
            </button>
          ))}
        </div>
        {msg && <p className="notice error">{msg}</p>}
        <table>
          <thead>
            <tr><th>Medicine</th><th>SKU</th><th>Batch</th><th>Qty</th><th>Expiry</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {visible.map((b) => {
              const expired = new Date(b.expiryDate) < now;
              const low = b.quantity <= b.medicine.minStock;
              return (
                <tr key={b.id}>
                  <td>{b.medicine.name}</td>
                  <td>{b.medicine.sku}</td>
                  <td>{b.batchNumber}</td>
                  <td>{b.quantity}</td>
                  <td>{new Date(b.expiryDate).toLocaleDateString()}</td>
                  <td>{expired ? "🔴 Expired" : low ? "⚠️ Low" : "🟢 Safe"}</td>
                  <td><button className="ghost" onClick={() => adjust(b)}>Adjust</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
