import type { ReactNode } from "react";
import { guardAdminPage } from "@/lib/authz";

// Admin-only page (never delegated to normal users).
export default async function Layout({ children }: { children: ReactNode }) {
  await guardAdminPage();
  return <>{children}</>;
}
