import "./globals.css";
import { getSession } from "@/lib/auth";
import Shell from "@/components/Shell";

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
          {children}
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
        <Shell userName={session.name} userRole={session.role}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
