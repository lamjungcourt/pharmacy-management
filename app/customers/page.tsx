"use client";
import { useEffect, useState } from "react";

type Customer = { id: number; name: string; phone?: string; address?: string; panVat?: string; dueAmount: number };

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ name: "", phone: "", address: "", panVat: "", dueAmount: "" });
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/customers?q=" + encodeURIComponent(q)).then((r) => r.json()).then(setRows);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Could not add customer");
      return;
    }
    setF({ name: "", phone: "", address: "", panVat: "", dueAmount: "" });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this customer?")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    load();
  }

  async function pay(c: Customer) {
    const amountStr = prompt(`Cash received from ${c.name} (current due: Rs. ${c.dueAmount.toFixed(2)}):`);
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!amount || amount <= 0) return;
    const r = await fetch(`/api/customers/${c.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Payment failed");
      return;
    }
    setMsg(`✅ Recorded Rs. ${amount.toFixed(2)} received from ${c.name}`);
    load();
  }

  const totalDue = rows.reduce((s, r) => s + r.dueAmount, 0);

  return (
    <section>
      <h1>Customers</h1>
      <div className="cards">
        <div className="card"><span>📤</span><small>Total Due from Customers</small><strong>Rs. {totalDue.toFixed(2)}</strong></div>
      </div>
      <div className="panel">
        <input placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <form className="grid" onSubmit={add}>
          <input required placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input placeholder="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <input placeholder="PAN/VAT" value={f.panVat} onChange={(e) => setF({ ...f, panVat: e.target.value })} />
          <input type="number" min="0" placeholder="Opening cash due (Rs.), if any" value={f.dueAmount} onChange={(e) => setF({ ...f, dueAmount: e.target.value })} />
          <button>Add Customer</button>
        </form>
        {msg && <p className="notice">{msg}</p>}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Address</th><th>PAN/VAT</th><th>Due (Baki)</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone ?? "—"}</td>
                <td>{c.address ?? "—"}</td>
                <td>{c.panVat ?? "—"}</td>
                <td>{c.dueAmount > 0 ? <b style={{ color: "#c0392b" }}>Rs. {c.dueAmount.toFixed(2)}</b> : c.dueAmount < 0 ? <b style={{ color: "#27ae60" }}>Advance Rs. {Math.abs(c.dueAmount).toFixed(2)}</b> : "Rs. 0.00"}</td>
                <td className="rowActions">
                  {c.dueAmount > 0 && <button className="ghost" onClick={() => pay(c)}>Record Payment</button>}
                  <button className="ghost danger" onClick={() => remove(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
