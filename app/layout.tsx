import "./globals.css";
import { getAuthContext } from "@/lib/authz";
import { PermissionsProvider } from "@/components/PermissionsProvider";
import { LanguageProvider } from "@/lib/i18n";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";

export const metadata = {
  title: "Pharmacy Management",
  description: "Pharmacy / Medical Shop Management System",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();

  if (!ctx) {
    // Unauthenticated pages (login) render without the app shell.
    return (
      <html lang="en">
        <body>
          <LanguageProvider>{children}</LanguageProvider>
          <footer className="appFooter">
            © {new Date().getFullYear()} Garuda Communication &amp; All Service Center. All rights reserved.
          </footer>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <PermissionsProvider initialPermissions={ctx.permissions} initialIsAdmin={ctx.isAdmin}>
            <div className="shell">
              <Sidebar />
              <main>
                <AppHeader name={ctx.user.name} role={ctx.user.role} />
                {children}
                <footer className="appFooter">
                  © {new Date().getFullYear()} Garuda Communication &amp; All Service Center. All rights reserved.
                </footer>
              </main>
            </div>
          </PermissionsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
