"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

export default function Medicines() {
  const { t, digits, formatDate } = useLanguage();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [f, setF] = useState<any>({
    name: "", genericName: "", sku: "", unit: "Tablet", batchNumber: "", purchaseRate: 0, sellingRate: 0, quantity: 0, freeQuantity: 0, expiryDate: "", minStock: 5,
  });

  const load = () => fetch("/api/medicines?q=" + encodeURIComponent(q)).then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, [q]);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((me) => setIsAdmin(me?.role === "ADMIN"));
  }, []);

  const SAMPLES = [
    { name: "Ibuprofen 400mg", genericName: "Ibuprofen", unit: "Tablet", days: 365, purchaseRate: 8, sellingRate: 13, quantity: 50, minStock: 10 },
    { name: "Azithromycin 250mg", genericName: "Azithromycin", unit: "Strip", days: 540, purchaseRate: 22, sellingRate: 35, quantity: 30, minStock: 5 },
    { name: "Metformin 500mg", genericName: "Metformin Hydrochloride", unit: "Tablet", days: 720, purchaseRate: 6, sellingRate: 11, quantity: 60, minStock: 15 },
    { name: "Vitamin C 500mg", genericName: "Ascorbic Acid", unit: "Tablet", days: 900, purchaseRate: 4, sellingRate: 8, quantity: 100, minStock: 20 },
    { name: "Cough Syrup 100ml", genericName: "Dextromethorphan", unit: "Syrup", days: 300, purchaseRate: 30, sellingRate: 48, quantity: 25, minStock: 5 },
  ];

  function fillSample() {
    const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    const stamp = Date.now().toString().slice(-6);
    const exp = new Date();
    exp.setDate(exp.getDate() + s.days);
    setMsg("");
    setF({
      name: s.name,
      genericName: s.genericName,
      sku: `SAMPLE-${stamp}`,
      batchNumber: `SMP-${stamp}`,
      purchaseRate: s.purchaseRate,
      sellingRate: s.sellingRate,
      quantity: s.quantity,
      freeQuantity: 0,
      unit: s.unit,
      expiryDate: exp.toISOString().slice(0, 10),
      minStock: s.minStock,
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
      setMsg(j.error ?? t("couldNotAddMedicine"));
      return;
    }
    setF({ ...f, name: "", genericName: "", sku: "", batchNumber: "", quantity: 0, freeQuantity: 0 });
    load();
  }

  async function remove(m: any) {
    if (!confirm(t("confirmDeleteMedicine"))) return;
    setMsg("");
    const r = await fetch(`/api/medicines/${m.id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error ?? t("couldNotDeleteMedicine"));
      return;
    }
    load();
  }

  return (
    <section>
      <h1>{t("medicines")}</h1>
      <div className="panel">
        <input
          placeholder={t("searchMedicineFull")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="formActions" style={{ marginTop: 10 }}>
          <button type="button" className="ghost" onClick={fillSample}>{t("fillSampleMedicine")}</button>
        </div>
        <form className="grid" onSubmit={add}>
          <input required placeholder={t("brandName")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder={t("genericName")} value={f.genericName} onChange={(e) => setF({ ...f, genericName: e.target.value })} />
          <input required placeholder={t("sku")} value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
          <label>
            {t("unitType")}
            <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
              <option value="Tablet">Tablet</option>
              <option value="Capsule">Capsule</option>
              <option value="Syrup">Syrup</option>
              <option value="Strip">Strip</option>
              <option value="Injection">Injection</option>
              <option value="Ointment">Ointment / Cream</option>
              <option value="Drops">Drops</option>
              <option value="unit">Other / unit</option>
            </select>
          </label>
          <input required placeholder={t("batch")} value={f.batchNumber} onChange={(e) => setF({ ...f, batchNumber: e.target.value })} />
          <label>
            {t("buyRate")} (Rs.)
            <input type="number" placeholder={t("buyRate")} value={f.purchaseRate} onChange={(e) => setF({ ...f, purchaseRate: e.target.value })} />
          </label>
          <label>
            {t("mrp")} (Rs.)
            <input type="number" placeholder={t("mrp")} value={f.sellingRate} onChange={(e) => setF({ ...f, sellingRate: e.target.value })} />
          </label>
          <input type="number" placeholder={t("quantity")} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
          <label>
            {t("freeQuantity")}
            <input type="number" placeholder={t("freeQuantity")} value={f.freeQuantity} onChange={(e) => setF({ ...f, freeQuantity: e.target.value })} />
          </label>
          <label>
            {t("expiryDate")}
            <input required type="date" value={f.expiryDate} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} />
          </label>
          <input type="number" placeholder={t("minStock")} value={f.minStock} onChange={(e) => setF({ ...f, minStock: e.target.value })} />
          <p className="totalAmountHint">{t("totalAmount")}: Rs. {digits(((Number(f.purchaseRate) || 0) * (Number(f.quantity) || 0)).toFixed(2))}</p>
          <button>{t("addMedicine")}</button>
        </form>
        {msg && <p className="notice error">{msg}</p>}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>{t("brandName")}</th><th>{t("genericName")}</th><th>{t("type")}</th><th>{t("sku")}</th><th>{t("batch")}</th><th>{t("expiry")}</th><th>{t("qty")}</th><th>{t("freeQuantity")}</th><th>{t("buyRate")}</th><th>{t("mrp")}</th><th>{t("totalAmount")}</th><th>{t("status")}</th>{isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((m) =>
              m.batches.map((b: any) => (
                <tr key={b.id}>
                  <td>{m.name}</td>
                  <td>{m.genericName || "—"}</td>
                  <td>{m.unit || "unit"}</td>
                  <td>{m.sku}</td>
                  <td>{b.batchNumber}</td>
                  <td>{formatDate(b.expiryDate)}</td>
                  <td>{digits(b.quantity)}</td>
                  <td>{digits(b.freeQuantity ?? 0)}</td>
                  <td>{digits(b.purchaseRate)}</td>
                  <td>{digits(b.sellingRate)}</td>
                  <td>{digits((b.quantity * b.purchaseRate).toFixed(2))}</td>
                  <td>{b.expiryDate < new Date().toISOString() ? t("expiredStatus") : b.quantity <= m.minStock ? t("low") : t("safe")}</td>
                  {isAdmin && (
                    <td className="rowActions">
                      <button className="ghost danger" onClick={() => remove(m)}>{t("delete")}</button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
