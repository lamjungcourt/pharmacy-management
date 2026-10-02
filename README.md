# Pharmacy / Medical Shop Management System

A Next.js + TypeScript + PostgreSQL pharmacy management system with login-protected access, POS billing, printable invoices, inventory, purchases, returns, and reporting.

## Included
- **Authentication**: username/password login, bcrypt-hashed passwords, signed session cookies, route protection via middleware, admin-only sections (Users, Settings), logout.
- **Dashboard** with a Daily/Monthly toggle showing sales, purchases, bills, profit, stock, low-stock/expiry alerts, and total dues (to suppliers and from customers).
- **Billing (POS)**: FEFO batch selection, live cart, discounts, VAT, walk-in or registered customers, automatic stock decrement, sequential invoice numbers, and **credit ("udhaar") sales** — sell now and collect payment later against a customer's account.
- **Printable invoices**: a print-formatted receipt view that opens the browser print dialog — works for A4 printers or thermal receipt printers, no extra dependencies.
- **Medicines & batches**, **Stock overview** with low-stock/expired/expiring filters and manual stock adjustments (with an audit trail via stock transactions).
- **Purchases** (stock-in) with supplier ("Party") selection, **cash-paid-now tracking**, and automatic batch creation/update. Any unpaid balance is tracked as a running due against that supplier.
- **Purchase Returns to Supplier**: return stock from any batch back to its supplier — reduces stock and automatically reduces what you owe that supplier.
- **Suppliers ("Party")** and **Customers** management (CRUD), each with a running due/credit balance and a "Record Payment" action to settle it.
- **Sales history** with search and reprint.
- **Returns** (customer → shop): look up an invoice, return specific line items, stock is restored automatically.
- **Reports**: a Daily/Monthly **Sales Report** and a Daily/Monthly **Purchase Report**, revenue/profit/discount totals, top-selling medicines, low-stock and expiry reports, supplier/customer due summaries, with a custom date range filter.
- **Users & Roles** (admin-only): the Dashboard's main account is Admin, who can create/manage other users (cashiers or additional admins), reset passwords, and change roles.
- PostgreSQL relational schema for users, medicines, batches, suppliers, customers, purchases, purchase returns, sales, customer/supplier payments, returns, and stock transactions.
- Responsive desktop/mobile layout.

## What's new in this update
- `Purchase.paidAmount` + `Supplier.dueAmount` — cash paid at purchase time vs. what's still owed to the supplier ("party").
- `PurchaseReturn` / `PurchaseReturnItem` — a dedicated Purchase Returns page to send stock back to a supplier.
- `Customer.dueAmount` + credit sales in Billing — record a sale even when the customer pays less than the total (udhaar), and collect payment later.
- `SupplierPayment` / `CustomerPayment` — payment history logs backing the "Record Payment" actions on the Suppliers and Customers pages.
- Dashboard and Reports now break sales and purchases down by **Daily** or **Monthly** periods, and surface total dues.
- Fixed a bug in the old dashboard API that could crash the page (it computed profit from `sale.items` without including that relation in the query).

## Run locally

1. Install Node.js 20+ and PostgreSQL.
2. Create a PostgreSQL database named `pharmacy`.
3. Copy `.env.example` to `.env`, set `DATABASE_URL`, and set `SESSION_SECRET` to a long random string (e.g. `openssl rand -base64 32`).
4. Run:
   ```
   npm install
   npx prisma generate
   npm run db:push
   npm run db:seed
   npm run dev
   ```
   Note: this update changed `prisma/schema.prisma` (new fields/models), so `npx prisma generate` and `npm run db:push` must be re-run even if you already had the project set up before.
5. Open http://localhost:3000 — you'll be redirected to `/login`.
6. Sign in with the seeded admin account: **admin / admin123**, then change the password from Users & Roles.

## Demo data
`npm run db:seed` creates a shop profile, an admin user, sample suppliers, and ~15 medicines with batches (including some already expired/low-stock for testing the dashboard and reports). An admin can also re-run this via `POST /api/seed` once logged in.

## Printing invoices
After completing a sale on the Billing page, click **"Print last invoice"**, or open any invoice from **Sales History**. The print view auto-opens your browser's print dialog; you can print to paper or "Save as PDF."

## Security notes for production use
This app now has working authentication, but before real pharmacy use you should still add: HTTPS everywhere, rate limiting on `/api/auth/login`, audit logging of sensitive actions, encrypted database backups, CSV/XLSX exports, barcode scanning support, and automated tests. Session tokens expire after 12 hours; adjust in `lib/auth.ts` if needed.

## Deployment
Build with `npm run build` and serve with `npm start`. Use a managed PostgreSQL database, set `SESSION_SECRET` and `DATABASE_URL` as environment variables, and serve over HTTPS.
