"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton({ label = "Log out" }: { label?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button className="logoutBtn" onClick={logout} type="button">
      {label}
    </button>
  );
}
