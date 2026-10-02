"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageProvider, LanguageSwitcher, useI18n } from "@/lib/i18n";

function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();
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
        <LanguageSwitcher />
        <div className="loginBrand">
          <span className="loginLogo">💊</span>
          <h1>{t("appTitle", "Pharmacy Management")}</h1>
          <p>{t("signIn")}</p>
        </div>
        <label>
          {t("username")}
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. admin"
            autoComplete="username"
          />
        </label>
        <label>
          {t("password")}
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
          {loading ? t("signingIn") : t("loginButton")}
        </button>
        <p className="loginHint">Default admin: <b>admin</b> / <b>admin123</b> (change after first login)</p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LanguageProvider>
      <LoginForm />
    </LanguageProvider>
  );
}
