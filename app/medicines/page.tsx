"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function Medicines() {
  const { t, digits, formatDate } = useI18n();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [f, setF] = useState<any>({
    name: "", genericName: "", manufacturer: "", category: "", barcode: "",
    sku: "", batchNumber: "", purchaseRate: 0, sellingRate: 0, quantity: 0,
    expiryDate: "", minStock: 5, reorderLevel: 5,
  });

  const load = () => fetch("/api/medicines?q=" + encodeURIComponent(q)).then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, [q]);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((me) => setIsAdmin(me?.role === "ADMIN"));
  }, []);

  const SAMPLES = [
    { name: "Ibuprofen 400mg", days: 365, purchaseRate: 8, sellingRate: 13, quantity: 50, minStock: 10 },
    { name: "Azithromycin 250mg", days: 540, purchaseRate: 22, sellingRate: 35, quantity: 30, minStock: 5 },
    { name: "Metformin 500mg", days: 720, purchaseRate: 6, sellingRate: 11, quantity: 60, minStock: 15 },
    { name: "Vitamin C 500mg", days: 900, purchaseRate: 4, sellingRate: 8, quantity: 100, minStock: 20 },
    { name: "Cough Syrup 100ml", days: 300, purchaseRate: 30, sellingRate: 48, quantity: 25, minStock: 5 },
  ];

  function fillSample() {
    const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    const stamp = Date.now().toString().slice(-6);
    const exp = new Date();
    exp.setDate(exp.getDate() + s.days);
    setMsg("");
    setF({
      ...f,
      name: s.name,
      sku: `SAMPLE-${stamp}`,
      batchNumber: `SMP-${stamp}`,
      purchaseRate: s.purchaseRate,
      sellingRate: s.sellingRate,
      quantity: s.quantity,
      expiryDate: exp.toISOString().slice(0, 10),
      minStock: s.minStock,
      reorderLevel: s.minStock,
    });
  }

  async function add(e: any) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error ?? "Could not add medicine.");
      return;
    }
    setF({ ...f, name: "", genericName: "", manufacturer: "", category: "", barcode: "", sku: "", batchNumber: "", quantity: 0 });
    load();
  }

  async function remove(m: any) {
    if (!confirm(`Archive "${m.name}"? It will stop appearing in new purchases/sales but its history is kept.`)) return;
    setMsg("");
    const r = await fetch(`/api/medicines/${m.id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error ?? "Could not archive medicine.");
      return;
    }
    load();
  }

  return (
    <section>
      <h1>{t("medicines")}</h1>
      <div className="panel">
        <input
          placeholder={t("searchMedicineAll")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="formActions" style={{ marginTop: 10 }}>
          <button type="button" className="ghost" onClick={fillSample}>{t("fillSampleMedicine")}</button>
        </div>
        <form className="grid" onSubmit={add}>
          {[
            "name", "genericName", "manufacturer", "category", "barcode", "sku",
            // Opening stock (which carries cost) can only be entered here by an Admin;
            // a Cashier can still register the medicine master, but stock-in for it must
            // then go through the admin-only Purchases module, keeping master data and
            // cost-bearing transaction data on separate, correctly-gated paths.
            ...(isAdmin ? ["batchNumber", "purchaseRate", "sellingRate", "quantity", "expiryDate"] : []),
            "minStock", "reorderLevel",
          ].map((k) => (
            <input
              key={k}
              required={["name", "sku", "batchNumber", "expiryDate"].includes(k)}
              placeholder={t(k, k)}
              type={k === "expiryDate" ? "date" : ["purchaseRate", "sellingRate", "quantity", "minStock", "reorderLevel"].includes(k) ? "number" : "text"}
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          ))}
          <button>{t("addMedicine")}</button>
        </form>
        {!isAdmin && <p className="notice">Note: as a Cashier you can add the medicine record; an Admin adds its opening stock via Purchases.</p>}
        {msg && <p className="notice error">{msg}</p>}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>{t("medicine")}</th><th>{t("sku")}</th><th>{t("batch")}</th><th>{t("expiryDate")}</th><th>{t("qty")}</th>
              {isAdmin && <th>{t("buy")}</th>}
              <th>{t("sell")}</th><th>{t("status")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((m) =>
              (m.batches.length ? m.batches : [null]).map((b: any, i: number) => (
                <tr key={b?.id ?? `${m.id}-empty-${i}`}>
                  <td><Link href={`/medicines/${m.id}`}>{m.name}</Link></td>
                  <td>{m.sku}</td>
                  <td>{b?.batchNumber ?? "—"}</td>
                  <td>{b ? formatDate(b.expiryDate) : "—"}</td>
                  <td>{digits(b?.quantity ?? 0)}</td>
                  {isAdmin && <td>{b?.purchaseRate != null ? digits(b.purchaseRate) : "—"}</td>}
                  <td>{b?.sellingRate != null ? digits(b.sellingRate) : "—"}</td>
                  <td>{!b ? `— ${t("noStock")}` : b.expiryDate < new Date().toISOString() ? `🔴 ${t("expired")}` : b.quantity <= m.minStock ? `⚠️ ${t("lowStock")}` : `🟢 ${t("safe")}`}</td>
                  <td className="rowActions">
                    <Link href={`/medicines/${m.id}`} className="ghost" style={{ padding: "7px 10px", fontSize: 13, borderRadius: 8, textDecoration: "none" }}>{t("view")}</Link>
                    {isAdmin && <button className="ghost danger" onClick={() => remove(m)}>{t("archive")}</button>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
