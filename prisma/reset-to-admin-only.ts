// One-time reset script.
//
// Does two things:
//   1. Removes the demo medicines (SKUs MED-001..MED-005) and the demo
//      "Sample Pharma Supplier" — same safe logic as cleanup-demo.ts: a medicine
//      or supplier is only deleted if it was never actually used in a real
//      sale/purchase/stock record.
//   2. Deletes every user account except the one protected root admin, so only
//      "admin" is left to log in with afterwards.
//
// A user who has completed sales in the past CANNOT be deleted — Sale.cashierId
// is a required field, kept on purpose so historical invoices always show who
// rang them up. That account is skipped (not silently ignored) and printed so
// you know it's still there and why.
//
// Run with:  npx tsx prisma/reset-to-admin-only.ts
import { db } from "../lib/prisma";

const DEMO_SKUS = ["MED-001", "MED-002", "MED-003", "MED-004", "MED-005"];

async function main() {
  console.log("=== Step 1: removing demo medicines ===");
  let medsRemoved = 0;
  let medsSkipped = 0;
  for (const sku of DEMO_SKUS) {
    const med = await db.medicine.findUnique({ where: { sku } });
    if (!med) continue;
    try {
      await db.medicine.delete({ where: { id: med.id } });
      medsRemoved++;
      console.log(`Deleted demo medicine: ${med.name} (${sku})`);
    } catch {
      medsSkipped++;
      console.log(`Skipped ${med.name} (${sku}) — it already has real sales/purchase history, so it was left alone.`);
    }
  }

  const demoSupplier = await db.supplier.findFirst({ where: { name: "Sample Pharma Supplier" } });
  if (demoSupplier) {
    try {
      await db.supplier.delete({ where: { id: demoSupplier.id } });
      console.log("Deleted demo supplier: Sample Pharma Supplier");
    } catch {
      console.log("Skipped deleting 'Sample Pharma Supplier' — it's still referenced by real records.");
    }
  }
  console.log(`Medicines: removed ${medsRemoved}, skipped ${medsSkipped}.`);

  console.log("\n=== Step 2: removing every user except the protected root admin ===");
  const users = await db.user.findMany({ where: { isProtected: false } });
  let usersRemoved = 0;
  let usersSkipped = 0;
  for (const u of users) {
    try {
      await db.user.delete({ where: { id: u.id } });
      usersRemoved++;
      console.log(`Deleted user: ${u.name} (${u.username})`);
    } catch {
      usersSkipped++;
      console.log(
        `Skipped ${u.name} (${u.username}) — they have sales recorded under their account, ` +
          `so deleting them would break those invoices' history. Change their role to Cashier ` +
          `and reset their password instead, or delete them later once those sales no longer matter.`
      );
    }
  }
  console.log(`Users: removed ${usersRemoved}, skipped ${usersSkipped}.`);

  const remaining = await db.user.findMany({ select: { name: true, username: true, role: true } });
  console.log("\nRemaining users:");
  for (const u of remaining) console.log(`  - ${u.name} (${u.username}) — ${u.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
