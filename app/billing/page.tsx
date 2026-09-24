"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { usePermissions } from "@/components/PermissionsProvider";

type Batch = { id: number; batchNumber: string; quantity: number; sellingRate: number; purchaseRate: number; expiryDate: string };
type Medicine = { id: number; name: string; sku: string; batches: Batch[] };
type CartLine = { medicineId: number; batchId: number; name: string; batch: string; qty: number; rate: number };
type Customer = { id: number; name: string; phone?: string; address?: string };

export default function Billing() {
  const { t, digits } = useLanguage();
  const { can } = usePermissions();
  const canSell = can("billing", "add");
  const canAddCustomer = can("customers", "add");
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paid, setPaid] = useState("");
  const [discount, setDiscount] = useState("");
  const [msg, setMsg] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [addingPatient, setAddingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", phone: "", address: "" });
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [vatRate, setVatRate] = useState(0);

  const loadCustomers = () => fetch("/api/customers").then((r) => (r.ok ? r.json() : [])).then(setCustomers).catch(() => {});

  useEffect(() => {
    fetch("/api/medicines?q=" + encodeURIComponent(q)).then((r) => (r.ok ? r.json() : [])).then(setMeds);
  }, [q]);

  useEffect(() => {
    loadCustomers();
    fetch("/api/settings").then((r) => r.json()).then((s) => setVatRate(Number(s?.vatRate ?? 0))).catch(() => {});
  }, []);

  async function addPatientInline() {
    const name = newPatient.name.trim();
    if (!name) return;
    setMsg("");
    const r = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPatient),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("couldNotAddPatient"));
      return;
    }
    await loadCustomers();
    setCustomerId(String(j.id));
    setNewPatient({ name: "", phone: "", address: "" });
    setAddingPatient(false);
  }

  function add(m: Medicine) {
    const b = m.batches.find((x) => x.quantity > 0);
    if (!b) return;
    setCart([...cart, { medicineId: m.id, batchId: b.id, name: m.name, batch: b.batchNumber, qty: 1, rate: b.sellingRate }]);
  }

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const subtotal = round2(cart.reduce((s, x) => s + x.qty * x.rate, 0));
  const taxable = Math.max(0, round2(subtotal - Number(discount || 0)));
  const tax = round2((taxable * vatRate) / 100);
  const total = round2(taxable + tax);
  const paidNum = paid === "" ? total : round2(Number(paid));
  const creditDue = Math.max(0, round2(total - paidNum));

  async function sale() {
    setMsg("");
    const r = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((x) => ({ medicineId: x.medicineId, batchId: x.batchId, quantity: x.qty })),
        discount: Number(discount || 0),
        paid: paidNum,
        paymentMethod: "CASH",
        customerId: customerId || undefined,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("saleFailed"));
      return;
    }
    setMsg(`✅ ${t("saleCompleted")}: ${j.invoiceNo}`);
    setLastSaleId(j.id);
    setCart([]);
    setPaid("");
    setDiscount("");
  }

  return (
    <section>
      <h1>{t("newSaleBilling")}</h1>
      <div className="pos">
        <div className="panel">
          <input
            autoFocus
            placeholder={t("searchMedicineSku")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {meds.slice(0, 8).map((m) => (
            <button className="suggest" key={m.id} onClick={() => add(m)}>
              {m.name} — {m.sku}
            </button>
          ))}
        </div>
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>{t("medicine")}</th>
                <th>{t("batch")}</th>
                <th>{t("qty")}</th>
                <th>{t("rate")}</th>
                <th>{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((x, i) => (
                <tr key={i}>
                  <td>{x.name}</td>
                  <td>{x.batch}</td>
                  <td>
                    <input
                      className="qty"
                      type="number"
                      min="1"
                      value={x.qty}
                      onChange={(e) => {
                        const c = [...cart];
                        c[i].qty = Number(e.target.value);
                        setCart(c);
                      }}
                    />
                  </td>
                  <td>{digits(x.rate)}</td>
                  <td>{digits((x.qty * x.rate).toFixed(2))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="totals">
            <label>
              {t("customerOptional")}
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">{t("walkInCustomer")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ""}</option>
                ))}
              </select>
              {!canAddCustomer ? null : !addingPatient ? (
                <button type="button" className="ghost" style={{ marginTop: 6 }} onClick={() => setAddingPatient(true)}>
                  {t("addPatient")}
                </button>
              ) : (
                <div className="grid" style={{ marginTop: 6 }}>
                  <input
                    autoFocus
                    placeholder={t("patientName")}
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  />
                  <input
                    placeholder={t("phone")}
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  />
                  <input
                    placeholder={t("address")}
                    value={newPatient.address}
                    onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  />
                  <div className="formActions">
                    <button type="button" onClick={addPatientInline}>{t("save")}</button>
                    <button type="button" className="ghost" onClick={() => { setAddingPatient(false); setNewPatient({ name: "", phone: "", address: "" }); }}>{t("cancel")}</button>
                  </div>
                </div>
              )}
            </label>
            <p>{t("subtotal")}: Rs. {digits(subtotal.toFixed(2))}</p>
            <input placeholder={t("discount")} type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            {vatRate > 0 && <p>{t("vat")} ({digits(vatRate)}%): Rs. {digits(tax.toFixed(2))}</p>}
            <h2>{t("total")}: Rs. {digits(total.toFixed(2))}</h2>
            <input placeholder={t("amountPaidHint")} type="number" value={paid} onChange={(e) => setPaid(e.target.value)} />
            {creditDue > 0 && (
              <p className="notice">
                {customerId
                  ? `⚠️ Rs. ${digits(creditDue.toFixed(2))} ${t("creditDueWithCustomerSuffix")}`
                  : `⚠️ ${t("creditDueNoCustomerPrefix")} Rs. ${digits(creditDue.toFixed(2))} ${t("creditDueNoCustomerSuffix")}`}
              </p>
            )}
            <button onClick={sale} disabled={!canSell || !cart.length || (creditDue > 0 && !customerId)}>{t("completeSale")}</button>
            {msg && <p className="notice">{msg}</p>}
            {lastSaleId && (
              <a className="printLink" href={`/billing/print/${lastSaleId}`} target="_blank" rel="noreferrer">
                🖨️ {t("printLastInvoice")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
