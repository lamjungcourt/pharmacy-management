"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { usePermissions } from "@/components/PermissionsProvider";

type Customer = { id: number; name: string; phone?: string; address?: string; panVat?: string; dueAmount: number };

export default function CustomersPage() {
  const { t, digits } = useLanguage();
  const { can } = usePermissions();
  const canAdd = can("customers", "add");
  const canEdit = can("customers", "edit");
  const canDelete = can("customers", "delete");
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ name: "", phone: "", address: "", panVat: "", dueAmount: "" });
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/customers?q=" + encodeURIComponent(q)).then((r) => (r.ok ? r.json() : [])).then(setRows);
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
      setMsg(j.error ?? t("couldNotAddCustomer"));
      return;
    }
    setF({ name: "", phone: "", address: "", panVat: "", dueAmount: "" });
    load();
  }

  async function remove(id: number) {
    if (!confirm(t("confirmDeleteCustomer"))) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    load();
  }

  async function pay(c: Customer) {
    const amountStr = prompt(`${t("cashReceivedFrom")} ${c.name} (${t("currentDueParen")}: Rs. ${digits(c.dueAmount.toFixed(2))}):`);
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
      setMsg(j.error ?? t("paymentFailed"));
      return;
    }
    setMsg(`✅ ${t("recordedReceivedFrom")} Rs. ${digits(amount.toFixed(2))} ${t("receivedFromSuffix")} ${c.name}`);
    load();
  }

  const totalDue = rows.reduce((s, r) => s + r.dueAmount, 0);

  return (
    <section>
      <h1>{t("customersTitle")}</h1>
      <div className="cards">
        <div className="card"><span>📤</span><small>{t("totalDueFromCustomers")}</small><strong>Rs. {digits(totalDue.toFixed(2))}</strong></div>
      </div>
      <div className="panel">
        <input placeholder={t("searchByNameOrPhone")} value={q} onChange={(e) => setQ(e.target.value)} />
        {canAdd && (
        <form className="grid" onSubmit={add}>
          <input required placeholder={t("name")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder={t("phone")} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input placeholder={t("address")} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <input placeholder={t("panVatCol")} value={f.panVat} onChange={(e) => setF({ ...f, panVat: e.target.value })} />
          <input type="number" min="0" placeholder={t("openingCashDue")} value={f.dueAmount} onChange={(e) => setF({ ...f, dueAmount: e.target.value })} />
          <button>{t("addCustomerBtn")}</button>
        </form>
        )}
        {msg && <p className="notice">{msg}</p>}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr><th>{t("name")}</th><th>{t("phone")}</th><th>{t("address")}</th><th>{t("panVatCol")}</th><th>{t("dueBaki")}</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone ?? "—"}</td>
                <td>{c.address ?? "—"}</td>
                <td>{c.panVat ?? "—"}</td>
                <td>{c.dueAmount > 0 ? <b style={{ color: "#c0392b" }}>Rs. {digits(c.dueAmount.toFixed(2))}</b> : c.dueAmount < 0 ? <b style={{ color: "#27ae60" }}>{t("advanceLabel")} Rs. {digits(Math.abs(c.dueAmount).toFixed(2))}</b> : `Rs. ${digits("0.00")}`}</td>
                <td className="rowActions">
                  {canEdit && c.dueAmount > 0 && <button className="ghost" onClick={() => pay(c)}>{t("recordPayment")}</button>}
                  {canDelete && <button className="ghost danger" onClick={() => remove(c.id)}>{t("delete")}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
