"use client";
import { useEffect, useState } from "react";

type UserRow = { id: number; name: string; username: string; role: "ADMIN" | "CASHIER" };

export default function UsersPage() {
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
      setMsg(j.error ?? "Could not create user");
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
    const password = prompt(`New password for ${u.username}:`);
    if (!password) return;
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setMsg(`Password updated for ${u.username}`);
  }

  async function remove(u: UserRow) {
    if (!confirm(`Delete user ${u.username}? This cannot be undone.`)) return;
    const r = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) {
      setMsg(j.error ?? "Could not delete user");
      return;
    }
    load();
  }

  return (
    <section>
      <h1>Users &amp; Roles</h1>
      <div className="panel">
        <h2>Add user</h2>
        <form className="grid" onSubmit={add}>
          <input required placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input required placeholder="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
          <input required type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="CASHIER">Cashier</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button>Add User</button>
        </form>
        {msg && <p className="notice">{msg}</p>}
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isAdmin = u.role === "ADMIN";
              return (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td>{isAdmin ? "🛡️ Admin" : "🧑‍💼 Cashier"}</td>
                  <td className="rowActions">
                    <button
                      className="ghost"
                      onClick={() => toggleRole(u)}
                      disabled={isAdmin}
                      title={isAdmin ? "Admin accounts are permanent and cannot be demoted" : undefined}
                    >
                      Make {isAdmin ? "Cashier" : "Admin"}
                    </button>
                    <button className="ghost" onClick={() => resetPassword(u)}>Reset password</button>
                    <button
                      className="ghost danger"
                      onClick={() => remove(u)}
                      disabled={isAdmin}
                      title={isAdmin ? "Admin accounts are permanent and cannot be deleted" : undefined}
                    >
                      Delete
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
