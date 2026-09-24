"use client";
import LogoutButton from "@/components/LogoutButton";
import { useLanguage } from "@/lib/i18n";

export default function AppHeader({ name, role }: { name: string; role: "ADMIN" | "CASHIER" }) {
  const { t } = useLanguage();
  return (
    <header className="appHeader">
      <b>{t("pharmacyManagementSystem")}</b>
      <div className="userbox">
        <span className="who">
          {name} <em>({role === "ADMIN" ? t("admin") : t("cashierRole")})</em>
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
