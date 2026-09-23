"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

type UserRow = { id: number; name: string; username: string; role: "ADMIN" | "CASHIER" };

export default function UsersPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ name: "", username: "", password: "", role: "CASHIER" });

  const load = () => fetch("/api/users").then((r) => r.json()).then(setRows);
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("couldNotCreateUser"));
      return;
    }
    setF({ name: "", username: "", password: "", role: "CASHIER" });
    load();
  }

  async function toggleRole(u: UserRow) {
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: u.role === "ADMIN" ? "CASHIER" : "ADMIN" }),
    });
    load();
  }

  async function resetPassword(u: UserRow) {
    const password = prompt(`${t("newPasswordPrompt")} ${u.username}:`);
    if (!password) return;
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setMsg(`${t("passwordUpdatedFor")} ${u.username}`);
  }

  async function remove(u: UserRow) {
    if (!confirm(`${t("confirmDeleteUser")} ${u.username}? ${t("cannotBeUndone")}`)) return;
    const r = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? t("couldNotDeleteUser"));
      return;
    }
    load();
  }

  return (
    <section>
      <h1>{t("usersAndRoles")}</h1>
      <div className="panel">
        <h2>{t("addUser")}</h2>
        <form className="grid" onSubmit={add}>
          <input required placeholder={t("fullName")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input required placeholder={t("usernameCol")} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
          <input required type="password" placeholder={t("password")} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="CASHIER">{t("cashierRole")}</option>
            <option value="ADMIN">{t("admin")}</option>
          </select>
          <button>{t("addUserBtn")}</button>
        </form>
        {msg && <p className="notice">{msg}</p>}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("usernameCol")}</th>
              <th>{t("role")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isAdmin = u.role === "ADMIN";
              return (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td>{isAdmin ? "🛡️ " + t("admin") : "🧑‍💼 " + t("cashierRole")}</td>
                  <td className="rowActions">
                    <button
                      className="ghost"
                      onClick={() => toggleRole(u)}
                      disabled={isAdmin}
                      title={isAdmin ? t("adminPermanentDemote") : undefined}
                    >
                      {isAdmin ? t("makeCashier") : t("makeAdmin")}
                    </button>
                    <button className="ghost" onClick={() => resetPassword(u)}>{t("resetPassword")}</button>
                    <button
                      className="ghost danger"
                      onClick={() => remove(u)}
                      disabled={isAdmin}
                      title={isAdmin ? t("adminPermanentDelete") : undefined}
                    >
                      {t("delete")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
