"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

type Supplier = { id: number; name: string; company?: string; phone?: string; email?: string; address?: string; dueAmount: number };
type Payment = { id: number; amount: number; receiptNo?: string; paidDate: string; supplier: { id: number; name: string } };

export default function SuppliersPage() {
  const { t, digits, formatDate } = useLanguage();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ name: "", company: "", phone: "", email: "", address: "" });
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/suppliers?q=" + encodeURIComponent(q)).then((r) => r.json()).then(setRows);
  const loadPayments = () => fetch("/api/supplier-payments").then((r) => r.json()).then(setPayments).catch(() => {});
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => { loadPayments(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("couldNotAddSupplier"));
      return;
    }
    setF({ name: "", company: "", phone: "", email: "", address: "" });
    load();
  }

  async function remove(id: number) {
    if (!confirm(t("confirmDeleteSupplier"))) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    load();
  }

  async function pay(s: Supplier) {
    const amountStr = prompt(`${t("cashPaidTo")} ${s.name} (${t("currentDueParen")}: Rs. ${digits(s.dueAmount.toFixed(2))}):`);
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!amount || amount <= 0) return;
    const receiptNo = prompt(t("cashReceiptNo")) || undefined;
    const r = await fetch(`/api/suppliers/${s.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, receiptNo }),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("paymentFailed"));
      return;
    }
    setMsg(`✅ ${t("recordedReceivedFrom")} Rs. ${digits(amount.toFixed(2))} ${t("paidToSuffix")} ${s.name}`);
    load();
    loadPayments();
  }

  const totalDue = rows.reduce((s, r) => s + r.dueAmount, 0);

  return (
    <section>
      <h1>{t("suppliersTitle")}</h1>
      <div className="cards">
        <div className="card"><span>📥</span><small>{t("totalDueToSuppliers")}</small><strong>Rs. {digits(totalDue.toFixed(2))}</strong></div>
      </div>
      <div className="panel">
        <input placeholder={t("searchByNameOrCompany")} value={q} onChange={(e) => setQ(e.target.value)} />
        <form className="grid" onSubmit={add}>
          <input required placeholder={t("name")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder={t("companyLabel")} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          <input placeholder={t("phone")} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input placeholder={t("emailLabel")} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input placeholder={t("address")} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <button>{t("addSupplierBtn")}</button>
        </form>
        {msg && <p className="notice">{msg}</p>}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr><th>{t("name")}</th><th>{t("companyLabel")}</th><th>{t("phone")}</th><th>{t("emailLabel")}</th><th>{t("dueBaki")}</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.company ?? "—"}</td>
                <td>{s.phone ?? "—"}</td>
                <td>{s.email ?? "—"}</td>
                <td>{s.dueAmount > 0 ? <b style={{ color: "#c0392b" }}>Rs. {digits(s.dueAmount.toFixed(2))}</b> : s.dueAmount < 0 ? <b style={{ color: "#27ae60" }}>{t("creditLabel")} Rs. {digits(Math.abs(s.dueAmount).toFixed(2))}</b> : `Rs. ${digits("0.00")}`}</td>
                <td className="rowActions">
                  {s.dueAmount > 0 && <button className="ghost" onClick={() => pay(s)}>{t("payBtn")}</button>}
                  <button className="ghost danger" onClick={() => remove(s.id)}>{t("delete")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h2>{t("partyReceipts")}</h2>
        <table>
          <thead>
            <tr><th>{t("dateCol")}</th><th>{t("partyName")}</th><th>{t("cashReceiptNo")}</th><th>{t("totalAmount")}</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.paidDate, true)}</td>
                <td><Link href="/suppliers">{p.supplier.name}</Link></td>
                <td>{p.receiptNo ?? "—"}</td>
                <td>Rs. {digits(p.amount.toFixed(2))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="formActions"><Link href="/">← {t("dashboard")}</Link></p>
      </div>
    </section>
  );
}
