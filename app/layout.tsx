import "./globals.css";
import { getSession } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";

export const metadata = {
  title: "Pharmacy Management",
  description: "Pharmacy / Medical Shop Management System",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
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
          <div className="shell">
            <Sidebar isAdmin={session.role === "ADMIN"} />
            <main>
              <AppHeader name={session.name} role={session.role} />
              {children}
              <footer className="appFooter">
                © {new Date().getFullYear()} Garuda Communication &amp; All Service Center. All rights reserved.
              </footer>
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
