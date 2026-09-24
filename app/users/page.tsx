"use client";
import { useEffect, useState } from "react";
import { useLanguage, type DictKey } from "@/lib/i18n";
import {
  ALL_ACTIONS,
  MODULE_KEYS,
  PERMISSION_MODULES,
  allExceptProfit,
  can,
  defaultUserPermissions,
  sanitizePermissions,
  type Action,
  type ModuleKey,
  type Permissions,
} from "@/lib/permissions";

type UserRow = { id: number; name: string; username: string; role: "ADMIN" | "CASHIER"; permissions: Permissions };

const MODULE_LABEL: Record<ModuleKey, DictKey> = {
  dashboard: "dashboard",
  billing: "billing",
  salesHistory: "salesHistory",
  returns: "returns",
  medicines: "medicines",
  stock: "stock",
  purchases: "purchases",
  purchaseReturns: "purchaseReturns",
  suppliers: "suppliers",
  customers: "customers",
  reports: "reports",
  profit: "profitAccess",
};
const ACTION_LABEL: Record<Action, DictKey> = {
  view: "permView",
  add: "permAdd",
  edit: "permEdit",
  delete: "permDelete",
};

// Profit is shown as its own highlighted section, not as a row in the normal matrix.
const MATRIX_MODULES = MODULE_KEYS.filter((m) => m !== "profit");

export default function UsersPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ name: "", username: "", password: "", role: "CASHIER" });
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [draft, setDraft] = useState<Permissions>({});
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/users").then((r) => (r.ok ? r.json() : [])).then(setRows);
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
    await load();
    // New normal users start with the default preset — open the editor right away so the Admin can adjust it.
    if (j.role === "CASHIER") openEditor(j);
  }

  async function toggleRole(u: UserRow) {
    if (u.role !== "ADMIN" && !confirm(t("confirmMakeAdmin"))) return;
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: u.role === "ADMIN" ? "CASHIER" : "ADMIN" }),
    });
    if (editing?.id === u.id) setEditing(null);
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
    if (editing?.id === u.id) setEditing(null);
    load();
  }

  function openEditor(u: UserRow) {
    setMsg("");
    setEditing(u);
    setDraft(sanitizePermissions(u.permissions));
  }

  // Ticking Add/Edit/Delete also ticks View; unticking View clears the whole module.
  function toggle(module: ModuleKey, action: Action) {
    setDraft((prev) => {
      const cur = new Set<Action>(prev[module] ?? []);
      if (cur.has(action)) {
        if (action === "view") cur.clear();
        else cur.delete(action);
      } else {
        cur.add(action);
      }
      return sanitizePermissions({ ...prev, [module]: [...cur] });
    });
  }

  async function savePermissions() {
    if (!editing) return;
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch(`/api/users/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: draft }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(j.error ?? t("couldNotSavePermissions"));
        return;
      }
      setMsg(`✅ ${t("permissionsSaved")} ${editing.username}`);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  function summary(u: UserRow) {
    if (u.role === "ADMIN") return `🛡️ ${t("fullAccess")}`;
    const n = MODULE_KEYS.filter((m) => m !== "profit" && can(u.permissions, m, "view")).length;
    return `${n} ${t("modulesWord")}${can(u.permissions, "profit", "view") ? " · 💵" : ""}`;
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

      {editing && (
        <div className="panel">
          <h2>🔑 {t("permissionsFor")} {editing.name} ({editing.username})</h2>
          <p style={{ color: "#667085" }}>{t("permissionsHint")}</p>
          <div className="formActions" style={{ marginTop: 0, marginBottom: 12, flexWrap: "wrap" }}>
            <button type="button" className="ghost" onClick={() => setDraft(defaultUserPermissions())}>{t("presetDefault")}</button>
            <button type="button" className="ghost" onClick={() => setDraft(allExceptProfit())}>{t("presetAllNoProfit")}</button>
            <button type="button" className="ghost danger" onClick={() => setDraft({})}>{t("presetClear")}</button>
          </div>
          <table className="permTable">
            <thead>
              <tr>
                <th>{t("moduleCol")}</th>
                {ALL_ACTIONS.map((a) => <th key={a} style={{ textAlign: "center" }}>{t(ACTION_LABEL[a])}</th>)}
              </tr>
            </thead>
            <tbody>
              {MATRIX_MODULES.map((m) => (
                <tr key={m}>
                  <td>{t(MODULE_LABEL[m])}</td>
                  {ALL_ACTIONS.map((a) => {
                    const supported = (PERMISSION_MODULES[m] as readonly Action[]).includes(a);
                    return (
                      <td key={a} style={{ textAlign: "center" }}>
                        {supported ? (
                          <input
                            type="checkbox"
                            checked={can(draft, m, a)}
                            onChange={() => toggle(m, a)}
                            aria-label={`${t(MODULE_LABEL[m])} – ${t(ACTION_LABEL[a])}`}
                          />
                        ) : (
                          <span style={{ color: "#98a2b3" }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="permProfit">
            <label>
              <input type="checkbox" checked={can(draft, "profit", "view")} onChange={() => toggle("profit", "view")} />
              <span>
                <b>💵 {t("allowProfitView")}</b>
                <br />
                <small>{t("profitAccessHint")}</small>
                <br />
                <small>{t("adminOnlyLock")}</small>
              </span>
            </label>
          </div>

          <div className="formActions">
            <button type="button" onClick={savePermissions} disabled={saving}>{t("savePermissions")}</button>
            <button type="button" className="ghost" onClick={() => setEditing(null)}>{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("usernameCol")}</th>
              <th>{t("role")}</th>
              <th>{t("accessCol")}</th>
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
                  <td>{summary(u)}</td>
                  <td className="rowActions">
                    {!isAdmin && (
                      <button className="ghost" onClick={() => openEditor(u)}>🔑 {t("permissions")}</button>
                    )}
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
