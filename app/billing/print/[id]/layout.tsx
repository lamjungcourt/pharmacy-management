import type { ReactNode } from "react";
import { guardAnyPage } from "@/lib/authz";

// The printable invoice is opened from Billing, Sales History and Returns, so any of them is enough.
export default async function Layout({ children }: { children: ReactNode }) {
  await guardAnyPage([["billing", "view"], ["salesHistory", "view"], ["returns", "view"]]);
  return <>{children}</>;
}
