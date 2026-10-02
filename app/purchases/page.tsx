"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Medicine = { id: number; name: string; sku: string };
type Supplier = { id: number; name: string; dueAmount: number };
type Line = {
  medicineId: string; batchNumber: string; quantity: string; freeQuantity: string;
  purchaseRate: string; sellingRate: string; discount: string; vat: string; expiryDate: string;
};
type PurchaseItem = { id: number; quantity: number; freeQuantity: number; purchaseRate: number; amount: number; medicine: { name: string }; batch: { batchNumber: string } };
type Purchase = {
  id: number;
  invoiceNo?: string | null;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  supplier?: { id: number; name: string } | null;
  items: PurchaseItem[];
};

const emptyLine = (): Line => ({ medicineId: "", batchNumber: "", quantity: "", freeQuantity: "0", purchaseRate: "", sellingRate: "", discount: "0", vat: "0", expiryDate: "" });

function PurchasesPageInner() {
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentType, setPaymentType] = useState<"CASH" | "CREDIT">("CASH");
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [creditDueDate, setCreditDueDate] = useState("");
  const [invoiceFileUrl, setInvoiceFileUrl] = useState("");
  const [invoiceFileName, setInvoiceFileName] = useState("");
  const [fileMsg, setFileMsg] = useState("");
  const searchParams = useSearchParams();
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [paidAmount, setPaidAmount] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/purchases").then((r) => r.json()).then(setPurchases);
  const loadSuppliers = () => fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);

  useEffect(() => {
    fetch("/api/medicines").then((r) => r.json()).then((m) => {
      const list = m.map((x: any) => ({ id: x.id, name: x.name, sku: x.sku }));
      setMeds(list);
      const medicineId = searchParams.get("medicineId");
      if (medicineId && list.some((x: Medicine) => String(x.id) === medicineId)) {
        setLines((prev) => (prev.length === 1 && !prev[0].medicineId ? [{ ...emptyLine(), medicineId }] : prev));
      }
    });
    loadSuppliers();
    load();
    const supplierId = searchParams.get("supplierId");
    if (supplierId) setSupplierId(supplierId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLine(i: number, patch: Partial<Line>) {
    const next = [...lines];
    next[i] = { ...next[i], ...patch };
    setLines(next);
  }

  function fillSampleLine() {
    setMsg("");
    if (!meds.length) {
      setMsg("No medicines yet — add one on the Medicines page first (it has a 🎲 Fill Sample Medicine button too).");
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
      discount: "0",
      vat: "0",
      expiryDate: exp.toISOString().slice(0, 10),
    };
    const emptyIdx = lines.findIndex((l) => !l.medicineId && !l.batchNumber && !l.quantity);
    if (emptyIdx >= 0) {
      updateLine(emptyIdx, sample);
    } else {
      setLines([...lines, sample]);
    }
  }

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.purchaseRate) || 0), 0);
  const discountTotal = lines.reduce((s, l) => s + (Number(l.discount) || 0), 0);
  const vatTotal = lines.reduce((s, l) => s + (Number(l.vat) || 0), 0);
  const total = subtotal - discountTotal + vatTotal;
  const effectivePaid = paymentType === "CASH" ? total : Number(paidAmount) || 0;
  const due = Math.max(0, total - effectivePaid);

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
      setMsg(j.error ?? "Could not add vendor");
      return;
    }
    await loadSuppliers();
    setSupplierId(String(j.id));
    setNewSupplierName("");
    setAddingSupplier(false);
  }

  function handleInvoiceFile(file: File | undefined) {
    setFileMsg("");
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setFileMsg("File is too large — please attach an image/PDF under 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setInvoiceFileUrl(String(reader.result));
      setInvoiceFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const items = lines.filter((l) => l.medicineId && l.batchNumber && l.quantity && l.expiryDate);
    if (!items.length) {
      setMsg("Add at least one complete line item");
      return;
    }
    if (paymentType === "CREDIT" && !supplierId) {
      setMsg("Select or add a vendor to record a credit purchase");
      return;
    }
    const r = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: supplierId || undefined,
        invoiceNo: invoiceNo || undefined,
        purchaseDate,
        paidAmount: paymentType === "CASH" ? total : Number(paidAmount) || 0,
        paymentType,
        paidDate: paymentType === "CASH" ? paidDate : (Number(paidAmount) || 0) > 0 ? paidDate : undefined,
        creditDueDate: paymentType === "CREDIT" ? creditDueDate || undefined : undefined,
        invoiceFileUrl: invoiceFileUrl || undefined,
        invoiceFileName: invoiceFileName || undefined,
        items: items.map((l) => ({
          medicineId: l.medicineId,
          batchNumber: l.batchNumber,
          quantity: l.quantity,
          freeQuantity: l.freeQuantity || 0,
          purchaseRate: l.purchaseRate || 0,
          sellingRate: l.sellingRate || l.purchaseRate || 0,
          discount: l.discount || 0,
          vat: l.vat || 0,
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
    setInvoiceNo("");
    setPaymentType("CASH");
    setPaidDate(new Date().toISOString().slice(0, 10));
    setCreditDueDate("");
    setInvoiceFileUrl("");
    setInvoiceFileName("");
    load();
    loadSuppliers();
  }

  return (
    <section>
      <h1>Purchases (Stock In)</h1>
      <div className="panel">
        <h2>Record a purchase</h2>
        <form onSubmit={submit}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1.4fr 1fr" }}>
            <label>
              Vendor (Party)
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— None —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.dueAmount ? ` (Due Rs. ${s.dueAmount.toFixed(2)})` : ""}
                  </option>
                ))}
              </select>
              {!addingSupplier ? (
                <button type="button" className="ghost" style={{ marginTop: 6 }} onClick={() => setAddingSupplier(true)}>
                  + Add new vendor
                </button>
              ) : (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input
                    autoFocus
                    placeholder="New vendor name"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSupplierInline())}
                  />
                  <button type="button" onClick={addSupplierInline}>Save</button>
                  <button type="button" className="ghost" onClick={() => { setAddingSupplier(false); setNewSupplierName(""); }}>Cancel</button>
                </div>
              )}
            </label>
            <label>
              Invoice No.
              <input placeholder="e.g. INV-001" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            </label>
            <label>
              Purchase Date
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </label>
            <label>
              Payment Type
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as "CASH" | "CREDIT")}>
                <option value="CASH">Cash (paid in full now)</option>
                <option value="CREDIT">Credit (pay vendor later)</option>
              </select>
              {paymentType === "CASH" ? (
                <label style={{ display: "block", marginTop: 6, fontWeight: 400 }}>
                  Cash paid date
                  <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                </label>
              ) : (
                <>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount paid now (optional, 0 if none)"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    style={{ marginTop: 6 }}
                  />
                  <label style={{ display: "block", marginTop: 6, fontWeight: 400 }}>
                    {Number(paidAmount) > 0 ? "Date paid so far" : "Credit due date"}
                    <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                  </label>
                  <label style={{ display: "block", marginTop: 6, fontWeight: 400 }}>
                    Credit due date (when vendor must be paid)
                    <input type="date" value={creditDueDate} onChange={(e) => setCreditDueDate(e.target.value)} />
                  </label>
                </>
              )}
            </label>
            <label>
              Attach invoice (photo / PDF)
              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleInvoiceFile(e.target.files?.[0])} />
              {invoiceFileName && <span style={{ display: "block", fontSize: 12, marginTop: 4 }}>📎 {invoiceFileName} <button type="button" className="ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => { setInvoiceFileUrl(""); setInvoiceFileName(""); }}>Remove</button></span>}
              {fileMsg && <span style={{ display: "block", color: "#c0392b", fontSize: 12 }}>{fileMsg}</span>}
            </label>
          </div>
          <div className="formActions" style={{ marginBottom: 10 }}>
            <button type="button" className="ghost" onClick={fillSampleLine}>🎲 Fill Sample Line</button>
          </div>
          <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Medicine</th><th>Batch #</th><th>Qty</th><th>Free</th><th>Buy rate</th><th>Sell rate</th>
                <th>Discount</th><th>VAT</th><th>Expiry</th>
              </tr>
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
                  <td><input className="qty" type="number" value={l.freeQuantity} onChange={(e) => updateLine(i, { freeQuantity: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.purchaseRate} onChange={(e) => updateLine(i, { purchaseRate: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.sellingRate} onChange={(e) => updateLine(i, { sellingRate: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.discount} onChange={(e) => updateLine(i, { discount: e.target.value })} /></td>
                  <td><input className="qty" type="number" value={l.vat} onChange={(e) => updateLine(i, { vat: e.target.value })} /></td>
                  <td><input type="date" value={l.expiryDate} onChange={(e) => updateLine(i, { expiryDate: e.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p>
            Subtotal: <b>Rs. {subtotal.toFixed(2)}</b> · Discount: <b>Rs. {discountTotal.toFixed(2)}</b> · VAT: <b>Rs. {vatTotal.toFixed(2)}</b> · Net total: <b>Rs. {total.toFixed(2)}</b> · Paid now: <b>Rs. {effectivePaid.toFixed(2)}</b> ·{" "}
            {supplierId ? <span>Will add to Vendor due: <b>Rs. {due.toFixed(2)}</b></span> : <span>Select a vendor to track due</span>}
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
            <tr><th>Date</th><th>Invoice</th><th>Supplier (Party)</th><th>Items</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                <td>{p.invoiceNo ?? `#${p.id}`}</td>
                <td>{p.supplier ? <Link href={`/suppliers/${p.supplier.id}`}>{p.supplier.name}</Link> : "—"}</td>
                <td>{p.items.map((it) => `${it.medicine.name} (${it.batch.batchNumber}) ×${it.quantity}${it.freeQuantity ? `+${it.freeQuantity} free` : ""}`).join(", ")}</td>
                <td>Rs. {p.totalAmount.toFixed(2)}</td>
                <td>Rs. {p.paidAmount.toFixed(2)}</td>
                <td>{p.totalAmount - p.paidAmount > 0 ? <b style={{ color: "#c0392b" }}>Rs. {(p.totalAmount - p.paidAmount).toFixed(2)}</b> : "—"}</td>
                <td>{p.status}</td>
                <td><Link href={`/purchases/${p.id}`}>View / Print</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense fallback={<section><p>Loading…</p></section>}>
      <PurchasesPageInner />
    </Suspense>
  );
}
