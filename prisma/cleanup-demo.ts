// One-time cleanup for databases that already ran the old seed script,
// which used to insert 5 demo medicines (SKUs MED-001..MED-005, batches DEMO-1..5)
// and a "Sample Pharma Supplier". Safe to run any time — it only deletes medicines
// with those exact demo SKUs, and only if they were never actually sold or purchased
// through the app (so real data is never touched).
//
// Run with:  npx tsx prisma/cleanup-demo.ts
import { db } from "../lib/prisma";

const DEMO_SKUS = ["MED-001", "MED-002", "MED-003", "MED-004", "MED-005"];

async function main() {
  let removed = 0;
  let skipped = 0;

  for (const sku of DEMO_SKUS) {
    const med = await db.medicine.findUnique({ where: { sku } });
    if (!med) continue;
    try {
      await db.medicine.delete({ where: { id: med.id } });
      removed++;
      console.log(`Deleted demo medicine: ${med.name} (${sku})`);
    } catch {
      skipped++;
      console.log(`Skipped ${med.name} (${sku}) — it already has real sales/purchase history, so it was left alone.`);
    }
  }

  // Remove the demo supplier only if nothing (batches/purchases) still references it.
  const demoSupplier = await db.supplier.findFirst({ where: { name: "Sample Pharma Supplier" } });
  if (demoSupplier) {
    try {
      await db.supplier.delete({ where: { id: demoSupplier.id } });
      console.log("Deleted demo supplier: Sample Pharma Supplier");
    } catch {
      console.log("Skipped deleting 'Sample Pharma Supplier' — it's still referenced by real records.");
    }
  }

  console.log(`\nDone. Removed ${removed} demo medicine(s), skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
