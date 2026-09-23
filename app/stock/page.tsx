"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

type Batch = {
  id: number; batchNumber: string; quantity: number; purchaseRate: number; sellingRate: number; expiryDate: string;
  medicine: { id: number; name: string; sku: string; minStock: number };
};

export default function StockPage() {
  const { t, digits, formatDate } = useLanguage();
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
    const input = prompt(`${t("adjustStockForPrefix")} ${batch.medicine.name} (${batch.batchNumber}).\n${t("currentQtyLabel")}: ${digits(batch.quantity)}\n${t("enterChangeHint")}:`);
    if (!input) return;
    const delta = Number(input);
    if (!delta) return;
    const reason = prompt(`${t("reasonForAdjustment")}:`) || undefined;
    const r = await fetch("/api/stock/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: batch.id, delta, reason }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("adjustmentFailed"));
      return;
    }
    setMsg("");
    load();
  }

  return (
    <section>
      <h1>{t("stockOverview")}</h1>
      <div className="panel">
        <input placeholder={t("searchMedicineSkuBatch")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filterRow">
          {(["all", "low", "expired", "expiring"] as const).map((f) => (
            <button key={f} className={filter === f ? "chip active" : "chip"} onClick={() => setFilter(f)}>
              {f === "all" ? t("allStock") : f === "low" ? "⚠️ " + t("lowStockFilter") : f === "expired" ? t("expiredStatus") : "🟠 " + t("expiringSoonFilter")}
            </button>
          ))}
        </div>
        {msg && <p className="notice error">{msg}</p>}
        <table>
          <thead>
            <tr><th>{t("medicine")}</th><th>{t("sku")}</th><th>{t("batch")}</th><th>{t("qty")}</th><th>{t("expiry")}</th><th>{t("status")}</th><th></th></tr>
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
                  <td>{digits(b.quantity)}</td>
                  <td>{formatDate(b.expiryDate)}</td>
                  <td>{expired ? t("expiredStatus") : low ? t("low") : t("safe")}</td>
                  <td><button className="ghost" onClick={() => adjust(b)}>{t("adjustAction")}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
