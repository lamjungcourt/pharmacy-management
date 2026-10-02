import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { isAdminSession, redactMedicineForRole } from "@/lib/authz";

export async function GET(req: Request) {
  const session = await getSession();
  const admin = isAdminSession(session);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const includeInactive = searchParams.get("includeInactive") === "1";
  const medicines = await db.medicine.findMany({
    where: {
      AND: [
        includeInactive ? {} : { isActive: true },
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { genericName: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q, mode: "insensitive" } },
            { batches: { some: { batchNumber: { contains: q, mode: "insensitive" } } } },
          ],
        },
      ],
    },
    include: { batches: { include: { supplier: true }, orderBy: { expiryDate: "asc" } } },
    orderBy: { name: "asc" },
  });
  // Medicine is the central master record referenced everywhere (Stock, Purchases,
  // Sales, Reports, Dashboard...). Whatever reaches a Cashier through this endpoint
  // must never carry batch.purchaseRate (that's the cost basis profit is computed from).
  const safe = medicines.map((m) => redactMedicineForRole(m, admin));
  return NextResponse.json(safe);
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const b = await req.json();
    if (!b.name || !b.sku) {
      const e = new Error("Name and SKU are required") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    const m = await db.medicine.create({
      data: {
        name: b.name,
        genericName: b.genericName || undefined,
        manufacturer: b.manufacturer || undefined,
        category: b.category || undefined,
        dosageForm: b.dosageForm || undefined,
        strength: b.strength || undefined,
        unit: b.unit ?? "unit",
        sku: b.sku,
        barcode: b.barcode || undefined,
        minStock: Number(b.minStock ?? 0),
        reorderLevel: Number(b.reorderLevel ?? b.minStock ?? 0),
        // Creating a medicine with an initial batch also opens a proper Purchase +
        // StockTransaction trail, rather than a disconnected batch row, so the very
        // first stock-in for a new medicine is still auditable the same way as any
        // later purchase.
        batches: b.batchNumber
          ? {
              create: {
                batchNumber: b.batchNumber,
                purchaseRate: Number(b.purchaseRate || 0),
                sellingRate: Number(b.sellingRate || 0),
                quantity: Number(b.quantity || 0),
                expiryDate: new Date(b.expiryDate),
                supplierId: b.supplierId ? Number(b.supplierId) : undefined,
              },
            }
          : undefined,
      },
      include: { batches: true },
    });
    if (b.batchNumber && Number(b.quantity || 0) > 0) {
      const batch = m.batches[0];
      await db.stockTransaction.create({
        data: {
          medicineId: m.id,
          batchId: batch.id,
          type: "PURCHASE",
          quantity: Number(b.quantity || 0),
          quantityIn: Number(b.quantity || 0),
          balanceAfter: batch.quantity,
          reference: "Opening stock (added from Medicine master)",
          supplierId: batch.supplierId ?? undefined,
          userId: session?.id,
        },
      });
    }
    const admin = isAdminSession(session);
    return NextResponse.json(redactMedicineForRole(m, admin), { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
