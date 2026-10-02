"use client";
import { useEffect, useRef, useState } from "react";

type Profile = {
  name?: string;
  panVat?: string;
  regNo?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  vatRate?: number | string;
  allowExpiredSales?: boolean;
};

const MAX_LOGO_MB = 5;

export default function Settings() {
  const [s, setS] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => setS(j ?? {}))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
    setNotice("");
  }

  function onLogoPick(file: File | undefined | null) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WEBP or SVG).");
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setError(`Logo image is too large. Please choose one under ${MAX_LOGO_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", String(reader.result));
    reader.onerror = () => setError("Could not read that image, please try another file.");
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!s.name || !s.name.trim()) {
      setError("Pharmacy name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...s,
          vatRate: Number(s.vatRate ?? 0),
          allowExpiredSales: Boolean(s.allowExpiredSales),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not save profile");
      setS(j);
      setNotice("Profile saved successfully.");
    } catch (e: any) {
      setError(e.message ?? "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section><p>Loading profile…</p></section>;

  return (
    <section>
      <h1>Pharmacy Profile</h1>

      <div className="panel profileHeader">
        <div
          className="logoDrop"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onLogoPick(e.dataTransfer.files?.[0]);
          }}
        >
          {s.logoUrl ? (
            <img src={s.logoUrl} alt="Pharmacy logo" />
          ) : (
            <span className="logoDropHint">🏥<br />Click or drop logo</span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: "none" }}
          onChange={(e) => onLogoPick(e.target.files?.[0])}
        />
        <div className="profileHeaderInfo">
          <h2>{s.name || "My Pharmacy"}</h2>
          <p>{s.panVat ? `PAN/VAT: ${s.panVat}` : "Add your PAN/VAT number below"}</p>
          <div className="formActions">
            <button type="button" onClick={() => fileRef.current?.click()}>
              {s.logoUrl ? "Change Logo" : "Upload Logo"}
            </button>
            {s.logoUrl && (
              <button type="button" className="ghost danger" onClick={() => set("logoUrl", "")}>
                Remove Logo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="panel form" style={{ marginTop: 20 }}>
        <label>
          Pharmacy Name
          <input value={s.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. City Pharmacy" />
        </label>
        <label>
          PAN / VAT Number
          <input value={s.panVat ?? ""} onChange={(e) => set("panVat", e.target.value)} placeholder="e.g. 123456789" />
        </label>
        <label>
          Registration No.
          <input value={s.regNo ?? ""} onChange={(e) => set("regNo", e.target.value)} placeholder="Pharmacy license / registration number" />
        </label>
        <label>
          Email
          <input value={s.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="contact@pharmacy.com" />
        </label>
        <label>
          Phone
          <input value={s.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="98XXXXXXXX" />
        </label>
        <label>
          Address
          <input value={s.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Street, City" />
        </label>
        <label>
          VAT Rate (%)
          <input
            type="number"
            value={s.vatRate ?? 0}
            onChange={(e) => set("vatRate", e.target.value as any)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={!!s.allowExpiredSales}
            onChange={(e) => set("allowExpiredSales", e.target.checked)}
          />{" "}
          Allow expired medicines to be sold
        </label>

        {error && <p className="notice error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        <button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>

      <DangerZone />
    </section>
  );
}

function DangerZone() {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");

  async function runReset() {
    if (confirmText !== "RESET") return;
    if (!confirm("This permanently deletes ALL medicines, batches, suppliers, customers, purchases, sales and returns, and every user account except the protected admin. This cannot be undone. Continue?")) {
      return;
    }
    setBusy(true);
    setErr("");
    setResult("");
    try {
      const r = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error ?? "Could not reset the data.");
        return;
      }
      const d = j.removed;
      setResult(
        `Done. Removed ${d.medicineCount} medicine(s), ${d.supplierCount} supplier(s), ${d.customerCount} customer(s), ` +
        `${d.saleCount} sale(s), ${d.purchaseCount} purchase(s), and ${d.userCount} user account(s). ` +
        `The pharmacy profile and the protected admin account were kept.`
      );
      setConfirmText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ borderColor: "#e5484d", marginTop: 24 }}>
      <h2 style={{ color: "#c0392b" }}>⚠️ Danger Zone — Clear Demo Data</h2>
      <p style={{ fontSize: 14, color: "#555" }}>
        Permanently deletes every medicine, batch, supplier, customer, purchase, sale and return, and every
        user account except the protected root admin. Use this to wipe out test/demo data before going live.
        Your pharmacy profile above and the protected admin login are kept. <b>This cannot be undone</b> —
        make a database backup first if you're not sure.
      </p>
      <label>
        Type <code>RESET</code> to confirm
        <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" />
      </label>
      <button
        className="ghost danger"
        onClick={runReset}
        disabled={confirmText !== "RESET" || busy}
        style={{ marginTop: 10 }}
      >
        {busy ? "Clearing…" : "🧹 Clear all medicines, parties & non-root users"}
      </button>
      {err && <p className="notice error">{err}</p>}
      {result && <p className="notice">{result}</p>}
    </div>
  );
}
