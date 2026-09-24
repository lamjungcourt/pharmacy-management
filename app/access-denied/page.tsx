"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { usePermissions } from "@/components/PermissionsProvider";
import { firstAllowedPath } from "@/lib/permissions";

export default function AccessDenied() {
  const { t } = useLanguage();
  const { permissions } = usePermissions();
  const home = firstAllowedPath(permissions);
  return (
    <section>
      <h1>🔒 {t("accessDenied")}</h1>
      <div className="panel">
        <p>{t("noPermissionPage")}</p>
        <p>{t("askAdminForAccess")}</p>
        {home ? (
          <p><Link href={home}>← {t("goToAllowedPage")}</Link></p>
        ) : (
          <p className="notice">{t("noModulesEnabled")}</p>
        )}
      </div>
    </section>
  );
}
