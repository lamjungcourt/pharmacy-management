import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requireAnyPermission, requirePermission, canSeeCostPrices, omitCostFields } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    // The medicine list feeds several screens (POS, stock, purchases, purchase returns), so any of them can read it.
    const ctx = await requireAnyPermission([
      ["medicines", "view"],
      ["stock", "view"],
      ["billing", "view"],
      ["purchases", "view"],
      ["purchaseReturns", "view"],
    ]);
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const medicines = await db.medicine.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { genericName: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { batches: { some: { batchNumber: { contains: q, mode: "insensitive" } } } },
        ],
      },
      include: { batches: { include: { supplier: true }, orderBy: { expiryDate: "asc" } } },
      orderBy: { name: "asc" },
    });
    // Buy rates (with selling rates) reveal profit margins — only send them to users allowed to see cost data.
    return NextResponse.json(canSeeCostPrices(ctx.permissions) ? medicines : omitCostFields(medicines));
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission("medicines", "add");
    const b = await req.json();
    const m = await db.medicine.create({
      data: {
        name: b.name,
        genericName: b.genericName,
        manufacturer: b.manufacturer,
        category: b.category,
        unit: b.unit ?? "unit",
        sku: b.sku,
        minStock: Number(b.minStock ?? 0),
        batches: b.batchNumber
          ? {
              create: {
                batchNumber: b.batchNumber,
                purchaseRate: Number(b.purchaseRate),
                sellingRate: Number(b.sellingRate),
                quantity: Number(b.quantity),
                freeQuantity: Number(b.freeQuantity ?? 0),
                expiryDate: new Date(b.expiryDate),
              },
            }
          : undefined,
      },
      include: { batches: true },
    });
    return NextResponse.json(canSeeCostPrices(ctx.permissions) ? m : omitCostFields(m), { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
