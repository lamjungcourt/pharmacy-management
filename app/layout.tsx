import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const metadata = {
  title: "Pharmacy Management",
  description: "Pharmacy / Medical Shop Management System",
};

const NAV = [
  { label: "Dashboard", href: "/", icon: "📊" },
  { label: "Billing", href: "/billing", icon: "🧾" },
  { label: "Medicines", href: "/medicines", icon: "💊" },
  { label: "Stock", href: "/stock", icon: "📦" },
  { label: "Purchases", href: "/purchases", icon: "🛒" },
  { label: "Purchase Returns", href: "/purchase-returns", icon: "↪️" },
  { label: "Suppliers (Party)", href: "/suppliers", icon: "🚚" },
  { label: "Customers", href: "/customers", icon: "🧑‍🤝‍🧑" },
  { label: "Sales History", href: "/sales-history", icon: "🕑" },
  { label: "Returns", href: "/returns", icon: "↩️" },
  { label: "Reports", href: "/reports", icon: "📈" },
  { label: "Pharmacy Profile", href: "/settings", icon: "🏥", adminOnly: true },
  { label: "Users", href: "/users", icon: "👤", adminOnly: true },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    // Unauthenticated pages (login) render without the app shell.
    return (
      <html lang="en">
        <body>
          {children}
          <footer className="appFooter">
            © {new Date().getFullYear()} Garuda Communication &amp; All Service Center. All rights reserved.
          </footer>
        </body>
      </html>
    );
  }

  const links = NAV.filter((n) => !n.adminOnly || session.role === "ADMIN");

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside>
            <h2>💊 Pharmacy</h2>
            <nav>
              {links.map((x) => (
                <Link key={x.href} href={x.href}>
                  <span className="navicon">{x.icon}</span>
                  {x.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main>
            <header>
              <b>Pharmacy Management System</b>
              <div className="userbox">
                <span className="who">
                  {session.name} <em>({session.role === "ADMIN" ? "Admin" : "Cashier"})</em>
                </span>
                <LogoutButton />
              </div>
            </header>
            {children}
            <footer className="appFooter">
              © {new Date().getFullYear()} Garuda Communication &amp; All Service Center. All rights reserved.
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}
