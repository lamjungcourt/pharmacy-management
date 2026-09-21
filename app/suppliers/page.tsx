"use client";
import { useEffect, useState } from "react";

type Supplier = { id: number; name: string; company?: string; phone?: string; email?: string; address?: string; dueAmount: number };

export default function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ name: "", company: "", phone: "", email: "", address: "" });
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/suppliers?q=" + encodeURIComponent(q)).then((r) => r.json()).then(setRows);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Could not add supplier");
      return;
    }
    setF({ name: "", company: "", phone: "", email: "", address: "" });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this supplier?")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    load();
  }

  async function pay(s: Supplier) {
    const amountStr = prompt(`Cash paid to ${s.name} (current due: Rs. ${s.dueAmount.toFixed(2)}):`);
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!amount || amount <= 0) return;
    const r = await fetch(`/api/suppliers/${s.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Payment failed");
      return;
    }
    setMsg(`✅ Recorded Rs. ${amount.toFixed(2)} paid to ${s.name}`);
    load();
  }

  const totalDue = rows.reduce((s, r) => s + r.dueAmount, 0);

  return (
    <section>
      <h1>Suppliers (Party)</h1>
      <div className="cards">
        <div className="card"><span>📥</span><small>Total Due to Suppliers</small><strong>Rs. {totalDue.toFixed(2)}</strong></div>
      </div>
      <div className="panel">
        <input placeholder="Search by name or company" value={q} onChange={(e) => setQ(e.target.value)} />
        <form className="grid" onSubmit={add}>
          <input required placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder="Company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          <input placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input placeholder="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <button>Add Supplier</button>
        </form>
        {msg && <p className="notice">{msg}</p>}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr><th>Name</th><th>Company</th><th>Phone</th><th>Email</th><th>Due (Baki)</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.company ?? "—"}</td>
                <td>{s.phone ?? "—"}</td>
                <td>{s.email ?? "—"}</td>
                <td>{s.dueAmount > 0 ? <b style={{ color: "#c0392b" }}>Rs. {s.dueAmount.toFixed(2)}</b> : s.dueAmount < 0 ? <b style={{ color: "#27ae60" }}>Credit Rs. {Math.abs(s.dueAmount).toFixed(2)}</b> : "Rs. 0.00"}</td>
                <td className="rowActions">
                  {s.dueAmount > 0 && <button className="ghost" onClick={() => pay(s)}>Pay</button>}
                  <button className="ghost danger" onClick={() => remove(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
