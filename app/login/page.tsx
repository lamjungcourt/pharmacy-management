"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
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
        <div className="langToggle" style={{ justifyContent: "flex-end", display: "flex" }}>
          <button type="button" className={lang === "en" ? "" : "ghost"} onClick={() => setLang("en")}>EN</button>
          <button type="button" className={lang === "ne" ? "" : "ghost"} onClick={() => setLang("ne")}>ने</button>
        </div>
        <div className="loginBrand">
          <span className="loginLogo">💊</span>
          <h1>{t("pharmacyManagementSystem")}</h1>
          <p>{t("signInToContinue")}</p>
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
          {loading ? t("signingIn") : t("signIn")}
        </button>
        <p className="loginHint">
          {t("defaultAdminHint")}: <b>admin</b> / <b>admin123</b> ({t("changeAfterFirstLogin")})
        </p>
      </form>
    </div>
  );
}
