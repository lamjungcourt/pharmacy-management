"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("next") || "/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage">
      <form className="loginCard" onSubmit={submit}>
        <div className="loginBrand">
          <span className="loginLogo">💊</span>
          <h1>Pharmacy Management</h1>
          <p>Sign in to continue</p>
        </div>
        <label>
          Username
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. admin"
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="loginError">{error}</p>}
        <button disabled={loading || !username || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="loginHint">Default admin: <b>admin</b> / <b>admin123</b> (change after first login)</p>
      </form>
    </div>
  );
}
