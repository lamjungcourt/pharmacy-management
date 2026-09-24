import type { ReactNode } from "react";
import { guardPage } from "@/lib/authz";

// Server-side page guard: runs on direct URL access AND on client-side navigation.
export default async function Layout({ children }: { children: ReactNode }) {
  await guardPage("returns", "view");
  return <>{children}</>;
}
