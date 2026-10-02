import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

// Tables wiped by this reset, listed child-first so the TRUNCATE ... CASCADE below
// has no foreign keys left dangling. ShopSettings and User are handled separately
// (User: only non-protected accounts are removed; ShopSettings is left untouched —
// the shop's own name/address/VAT rate is real configuration, not demo data).
const TABLES = [
  "StockTransaction",
  "ReturnItem", "Return",
  "PurchaseReturnItem", "PurchaseReturn",
  "SaleItem", "Sale",
  "PurchaseItem", "Purchase",
  "SupplierPayment", "CustomerPayment",
  "MedicineBatch", "Medicine",
  "Supplier", "Customer",
];

export async function POST(req: Request) {
  try {
    // This deletes every medicine, batch, supplier, customer, purchase, sale, return
    // and non-root user in the shop. It's meant for wiping out test/demo data before
    // going live, not routine use — require the admin to type a confirmation phrase
    // rather than just clicking a button, so it can't be triggered by accident.
    await requireAdmin();
    const b = await req.json().catch(() => ({}));
    if (b.confirm !== "RESET") {
      const e = new Error('Type RESET to confirm — this permanently deletes all medicines, suppliers, customers, purchases and sales.') as Error & { status?: number };
      e.status = 400;
      throw e;
    }

    const summary = await db.$transaction(async (tx) => {
      const [medicineCount, supplierCount, customerCount, saleCount, purchaseCount, userCount] = await Promise.all([
        tx.medicine.count(),
        tx.supplier.count(),
        tx.customer.count(),
        tx.sale.count(),
        tx.purchase.count(),
        tx.user.count({ where: { isProtected: false } }),
      ]);

      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE;`);
      // By now no Sale/Purchase rows reference any non-root user, so this is safe.
      await tx.user.deleteMany({ where: { isProtected: false } });

      return { medicineCount, supplierCount, customerCount, saleCount, purchaseCount, userCount };
    });

    return NextResponse.json({ ok: true, removed: summary });
  } catch (e) {
    return apiError(e);
  }
}
