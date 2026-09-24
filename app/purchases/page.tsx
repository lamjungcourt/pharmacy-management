"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { usePermissions } from "@/components/PermissionsProvider";

type Medicine = { id: number; name: string; sku: string };
type Supplier = { id: number; name: string; dueAmount: number };
type Line = { medicineId: string; batchNumber: string; quantity: string; freeQuantity: string; purchaseRate: string; sellingRate: string; expiryDate: string };
type PurchaseItem = { id: number; quantity: number; freeQuantity: number; purchaseRate: number; sellingRate: number; amount: number; medicine: { name: string }; batch: { batchNumber: string } };
type Purchase = {
  id: number;
  purchaseDate: string;
  totalAmount: number;
  discount: number;
  vatAmount: number;
  netAmount: number;
  paidAmount: number;
  supplier?: { id: number; name: string; panVat?: string } | null;
  items: PurchaseItem[];
};

const emptyLine = (): Line => ({ medicineId: "", batchNumber: "", quantity: "", freeQuantity: "", purchaseRate: "", sellingRate: "", expiryDate: "" });

export default function PurchasesPage() {
  const { t, digits, formatDate } = useLanguage();
  const { can } = usePermissions();
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [paymentType, setPaymentType] = useState<"CASH" | "CREDIT">("CASH");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [paidAmount, setPaidAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/purchases").then((r) => (r.ok ? r.json() : [])).then(setPurchases);
  const loadSuppliers = () => fetch("/api/suppliers").then((r) => (r.ok ? r.json() : [])).then(setSuppliers);

  useEffect(() => {
    fetch("/api/medicines").then((r) => (r.ok ? r.json() : [])).then((m) => setMeds(m.map((x: any) => ({ id: x.id, name: x.name, sku: x.sku }))));
    loadSuppliers();
    load();
  }, []);

  function updateLine(i: number, patch: Partial<Line>) {
    const next = [...lines];
    next[i] = { ...next[i], ...patch };
    setLines(next);
  }

  function fillSampleLine() {
    setMsg("");
    if (!meds.length) {
      setMsg(t("noMedicinesYet"));
      return;
    }
    const med = meds[Math.floor(Math.random() * meds.length)];
    const stamp = Date.now().toString().slice(-6);
    const purchaseRate = Math.floor(Math.random() * 20) + 5; // Rs. 5–24
    const sellingRate = Math.round(purchaseRate * 1.35);
    const quantity = (Math.floor(Math.random() * 8) + 2) * 10; // 20–90, step 10
    const exp = new Date();
    exp.setDate(exp.getDate() + 365);
    const sample: Line = {
      medicineId: String(med.id),
      batchNumber: `PB-${stamp}`,
      quantity: String(quantity),
      freeQuantity: "0",
      purchaseRate: String(purchaseRate),
      sellingRate: String(sellingRate),
      expiryDate: exp.toISOString().slice(0, 10),
    };
    // Fill the first empty line if there is one, otherwise add a new line.
    const emptyIdx = lines.findIndex((l) => !l.medicineId && !l.batchNumber && !l.quantity);
    if (emptyIdx >= 0) {
      updateLine(emptyIdx, sample);
    } else {
      setLines([...lines, sample]);
    }
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.purchaseRate) || 0), 0);
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const discountNum = Math.max(0, Number(discount) || 0);
  const taxable = Math.max(0, round2(total - discountNum));
  const vatRateNum = Number(vatRate) || 0;
  const vatAmount = round2((taxable * vatRateNum) / 100);
  const netTotal = round2(taxable + vatAmount);
  // In Cash mode the full bill is paid right now; in Credit mode the typed amount is paid and the rest becomes due to the vendor.
  const effectivePaid = paymentType === "CASH" ? netTotal : Number(paidAmount) || 0;
  const due = Math.max(0, netTotal - effectivePaid);

  async function addSupplierInline() {
    const name = newSupplierName.trim();
    if (!name) return;
    setMsg("");
    const r = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("couldNotAddVendor"));
      return;
    }
    await loadSuppliers();
    setSupplierId(String(j.id));
    setNewSupplierName("");
    setAddingSupplier(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const items = lines.filter((l) => l.medicineId && l.batchNumber && l.quantity && l.expiryDate);
    if (!items.length) {
      setMsg(t("addAtLeastOneLine"));
      return;
    }
    if (paymentType === "CREDIT" && !supplierId) {
      setMsg(t("selectVendorForCredit"));
      return;
    }
    const r = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: supplierId || undefined,
        discount: discountNum,
        vatRate: vatRateNum,
        paidAmount: paymentType === "CASH" ? netTotal : Number(paidAmount) || 0,
        paymentType,
        items: items.map((l) => ({
          medicineId: l.medicineId,
          batchNumber: l.batchNumber,
          quantity: l.quantity,
          freeQuantity: l.freeQuantity || 0,
          purchaseRate: l.purchaseRate || 0,
          sellingRate: l.sellingRate || l.purchaseRate || 0,
          expiryDate: l.expiryDate,
        })),
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("purchaseFailed"));
      return;
    }
    setMsg(t("purchaseRecorded"));
    setLines([emptyLine()]);
    setPaidAmount("");
    setDiscount("");
    setVatRate("");
    setPaymentType("CASH");
    load();
    loadSuppliers();
  }

  return (
    <section>
      <h1>{t("purchasesStockIn")}</h1>
      {can("purchases", "add") && (
      <div className="panel">
        <h2>{t("recordAPurchase")}</h2>
        <form onSubmit={submit}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label>
              {t("vendorParty")}
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t("noneOption")}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.dueAmount ? ` (${t("dueAmount")} Rs. ${digits(s.dueAmount.toFixed(2))})` : ""}
                  </option>
                ))}
              </select>
              {!can("suppliers", "add") ? null : !addingSupplier ? (
                <button type="button" className="ghost" style={{ marginTop: 6 }} onClick={() => setAddingSupplier(true)}>
                  {t("addNewVendor")}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input
                    autoFocus
                    placeholder={t("newVendorName")}
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSupplierInline())}
                  />
                  <button type="button" onClick={addSupplierInline}>{t("save")}</button>
                  <button type="button" className="ghost" onClick={() => { setAddingSupplier(false); setNewSupplierName(""); }}>{t("cancel")}</button>
                </div>
              )}
            </label>
            <label>
              {t("paymentType")}
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as "CASH" | "CREDIT")}>
                <option value="CASH">{t("cashPaidInFull")}</option>
                <option value="CREDIT">{t("creditPayLater")}</option>
              </select>
              {paymentType === "CREDIT" && (
                <input
                  type="number"
                  min="0"
                  placeholder={t("amountPaidNowOptional")}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              )}
            </label>
          </div>
          <div className="formActions" style={{ marginBottom: 10 }}>
            <button type="button" className="ghost" onClick={fillSampleLine}>{t("fillSampleLine")}</button>
          </div>
          <table>
            <thead>
              <tr><th>{t("productName")}</th><th>{t("batchNo")}</th><th>{t("expiry")}</th><th>{t("qty")}</th><th>{t("freeQuantity")}</th><th>{t("buyRate")}</th><th>{t("mrp")}</th><th>{t("amount")}</th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select value={l.medicineId} onChange={(e) => updateLine(i, { medicineId: e.target.value })}>
                      <option value="">{t("selectEllipsis")}</option>
                      {meds.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                      ))}
                    </select>
                  </td>
                  <td><input value={l.batchNumber} onChange={(e) => updateLine(i, { batchNumber: e.target.value })} /></td>
                  <td><input type="date" value={l.expiryDate} onChange={(e) => updateLine(i, { expiryDate: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.freeQuantity} onChange={(e) => updateLine(i, { freeQuantity: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.purchaseRate} onChange={(e) => updateLine(i, { purchaseRate: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.sellingRate} onChange={(e) => updateLine(i, { sellingRate: e.target.value })} /></td>
                  <td>{digits(((Number(l.quantity) || 0) * (Number(l.purchaseRate) || 0)).toFixed(2))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
            <label>
              {t("discount")} (Rs.)
              <input type="number" min="0" placeholder={t("discount")} value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>
            <label>
              {t("vat")} (%)
              <input type="number" min="0" placeholder={t("vat")} value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
            </label>
          </div>
          <p>
            {t("billTotal")}: <b>Rs. {digits(total.toFixed(2))}</b> · {t("discount")}: <b>Rs. {digits(discountNum.toFixed(2))}</b> ·{" "}
            {vatAmount > 0 && <>{t("vat")}: <b>Rs. {digits(vatAmount.toFixed(2))}</b> · </>}
            {t("netTotal")}: <b>Rs. {digits(netTotal.toFixed(2))}</b> · {t("paidNow")}: <b>Rs. {digits(effectivePaid.toFixed(2))}</b> ·{" "}
            {supplierId ? <span>{t("willAddToVendorDue")}: <b>Rs. {digits(due.toFixed(2))}</b></span> : <span>{t("selectVendorToTrackDue")}</span>}
          </p>
          <div className="formActions">
            <button type="button" className="ghost" onClick={() => setLines([...lines, emptyLine()])}>{t("addLine")}</button>
            <button type="submit">{t("savePurchase")}</button>
          </div>
          {msg && <p className="notice">{msg}</p>}
        </form>
      </div>
      )}
      <div className="panel">
        <h2>{t("recentPurchases")}</h2>
        <table>
          <thead>
            <tr><th>{t("dateCol")}</th><th>{t("supplierPartyCol")}</th><th>{t("itemsCol")}</th><th>{t("total")}</th><th>{t("discount")}</th><th>{t("vat")}</th><th>{t("netTotal")}</th><th>{t("paidCol")}</th><th>{t("dueCol")}</th></tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.purchaseDate, true)}</td>
                <td>{p.supplier?.name ?? "—"}{p.supplier?.panVat ? ` (VAT: ${digits(p.supplier.panVat)})` : ""}</td>
                <td>{p.items.map((it) => `${it.medicine.name} (${it.batch.batchNumber}) ×${it.quantity}${it.freeQuantity ? ` +${it.freeQuantity} free` : ""}`).join(", ")}</td>
                <td>Rs. {digits(p.totalAmount.toFixed(2))}</td>
                <td>Rs. {digits(p.discount.toFixed(2))}</td>
                <td>Rs. {digits(p.vatAmount.toFixed(2))}</td>
                <td>Rs. {digits(p.netAmount.toFixed(2))}</td>
                <td>Rs. {digits(p.paidAmount.toFixed(2))}</td>
                <td>{p.netAmount - p.paidAmount > 0 ? <b style={{ color: "#c0392b" }}>Rs. {digits((p.netAmount - p.paidAmount).toFixed(2))}</b> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
