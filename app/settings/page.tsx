"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";

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
  const { t, digits } = useLanguage();
  const [s, setS] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const lastVatRate = useRef<number>(13);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        setS(j ?? {});
        if (Number(j?.vatRate ?? 0) > 0) lastVatRate.current = Number(j.vatRate);
      })
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
      setError(t("pleaseChooseImage"));
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setError(`${t("logoTooLargePrefix")} ${MAX_LOGO_MB}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", String(reader.result));
    reader.onerror = () => setError(t("couldNotReadImage"));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!s.name || !s.name.trim()) {
      setError(t("pharmacyNameRequired"));
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
      if (!res.ok) throw new Error(j.error ?? t("couldNotSaveProfile"));
      setS(j);
      setNotice(t("profileSavedSuccessfully"));
    } catch (e: any) {
      setError(e.message ?? t("couldNotSaveProfile"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section><p>{t("loadingProfile")}</p></section>;

  return (
    <section>
      <h1>{t("pharmacyProfileTitle")}</h1>

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
          <h2>{s.name || t("myPharmacy")}</h2>
          <p>{s.panVat ? `PAN/VAT: ${digits(s.panVat)}` : t("addPanVatBelow")}</p>
          <div className="formActions">
            <button type="button" onClick={() => fileRef.current?.click()}>
              {s.logoUrl ? t("changeLogo") : t("uploadLogo")}
            </button>
            {s.logoUrl && (
              <button type="button" className="ghost danger" onClick={() => set("logoUrl", "")}>
                {t("removeLogo")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="panel form" style={{ marginTop: 20 }}>
        <label>
          {t("pharmacyName")}
          <input value={s.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. City Pharmacy" />
        </label>
        <label>
          {t("panVatNumberLabel")}
          <input value={s.panVat ?? ""} onChange={(e) => set("panVat", e.target.value)} placeholder="e.g. 123456789" />
        </label>
        <label>
          {t("registrationNo")}
          <input value={s.regNo ?? ""} onChange={(e) => set("regNo", e.target.value)} placeholder={t("registrationNoHint")} />
        </label>
        <label>
          {t("emailLabel")}
          <input value={s.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="contact@pharmacy.com" />
        </label>
        <label>
          {t("phone")}
          <input value={s.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="98XXXXXXXX" />
        </label>
        <label>
          {t("address")}
          <input value={s.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder={t("streetCity")} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={Number(s.vatRate ?? 0) > 0}
            onChange={(e) => {
              if (e.target.checked) {
                // Turning VAT on: restore the last rate you used, or suggest 13% (common in Nepal) — fully editable below.
                set("vatRate", lastVatRate.current || 13);
              } else {
                // Turning VAT off: remember the current rate in case you re-enable it, then set to 0 (no VAT charged).
                lastVatRate.current = Number(s.vatRate ?? 0) || lastVatRate.current;
                set("vatRate", 0);
              }
            }}
          />{" "}
          {t("chargeVat")} <span style={{ color: "#98a2b3" }}>({t("vatOptionalHint")})</span>
        </label>
        {Number(s.vatRate ?? 0) > 0 && (
          <label>
            {t("vatRatePercent")}
            <input
              type="number"
              min="0"
              step="0.1"
              value={s.vatRate ?? 0}
              onChange={(e) => set("vatRate", e.target.value as any)}
            />
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={!!s.allowExpiredSales}
            onChange={(e) => set("allowExpiredSales", e.target.checked)}
          />{" "}
          {t("allowExpiredMedicines")}
        </label>

        {error && <p className="notice error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        <button onClick={save} disabled={saving}>
          {saving ? t("savingEllipsis") : t("saveProfile")}
        </button>
      </div>
    </section>
  );
}
