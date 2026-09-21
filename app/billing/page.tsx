"use client";
import { useEffect, useState } from "react";

type Batch = { id: number; batchNumber: string; quantity: number; sellingRate: number; purchaseRate: number; expiryDate: string };
type Medicine = { id: number; name: string; sku: string; batches: Batch[] };
type CartLine = { medicineId: number; batchId: number; name: string; batch: string; qty: number; rate: number };
type Customer = { id: number; name: string; phone?: string };

export default function Billing() {
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paid, setPaid] = useState("");
  const [discount, setDiscount] = useState("");
  const [msg, setMsg] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/medicines?q=" + encodeURIComponent(q)).then((r) => r.json()).then(setMeds);
  }, [q]);

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then(setCustomers).catch(() => {});
  }, []);

  function add(m: Medicine) {
    const b = m.batches.find((x) => x.quantity > 0);
    if (!b) return;
    setCart([...cart, { medicineId: m.id, batchId: b.id, name: m.name, batch: b.batchNumber, qty: 1, rate: b.sellingRate }]);
  }

  const subtotal = cart.reduce((s, x) => s + x.qty * x.rate, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const paidNum = paid === "" ? total : Number(paid);
  const creditDue = Math.max(0, total - paidNum);

  async function sale() {
    setMsg("");
    const r = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((x) => ({ medicineId: x.medicineId, batchId: x.batchId, quantity: x.qty })),
        discount: Number(discount || 0),
        paid: Number(paid || total),
        paymentMethod: "CASH",
        customerId: customerId || undefined,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Sale failed");
      return;
    }
    setMsg(`✅ Sale completed: ${j.invoiceNo}`);
    setLastSaleId(j.id);
    setCart([]);
    setPaid("");
    setDiscount("");
  }

  return (
    <section>
      <h1>New Sale / Billing</h1>
      <div className="pos">
        <div className="panel">
          <input
            autoFocus
            placeholder="Search medicine / SKU"
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
                <th>Medicine</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
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
                  <td>{x.rate}</td>
                  <td>{(x.qty * x.rate).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="totals">
            <label>
              Customer (optional)
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <p>Subtotal: Rs. {subtotal.toFixed(2)}</p>
            <input placeholder="Discount" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <h2>Total: Rs. {total.toFixed(2)}</h2>
            <input placeholder="Amount paid (leave blank to pay in full)" type="number" value={paid} onChange={(e) => setPaid(e.target.value)} />
            {creditDue > 0 && (
              <p className="notice">
                {customerId
                  ? `⚠️ Rs. ${creditDue.toFixed(2)} will be added as credit (udhaar) due for this customer.`
                  : `⚠️ Select a customer to record the remaining Rs. ${creditDue.toFixed(2)} as credit (udhaar).`}
              </p>
            )}
            <button onClick={sale} disabled={!cart.length || (creditDue > 0 && !customerId)}>Complete Sale</button>
            {msg && <p className="notice">{msg}</p>}
            {lastSaleId && (
              <a className="printLink" href={`/billing/print/${lastSaleId}`} target="_blank" rel="noreferrer">
                🖨️ Print last invoice
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
