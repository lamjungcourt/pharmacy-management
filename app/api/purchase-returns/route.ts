import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requirePermission } from "@/lib/authz";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    await requirePermission("purchaseReturns", "view");
    const returns = await db.purchaseReturn.findMany({
      include: {
        supplier: true,
        items: { include: { medicine: true, batch: true } },
      },
      orderBy: { id: "desc" },
      take: 200,
    });
    return NextResponse.json(returns);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("purchaseReturns", "add");
    const b = await req.json();
    const items = (b.items ?? []) as { medicineId: number; batchId: number; quantity: number }[];
    if (!items.length) throw new Error("Add at least one item to return");

    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      let totalAmount = 0;
      let supplierId: number | null = b.supplierId ? Number(b.supplierId) : null;
      const createItems: any[] = [];

      for (const line of items) {
        const batch = await tx.medicineBatch.findUnique({ where: { id: Number(line.batchId) } });
        if (!batch) throw new Error("Batch not found");
        const qty = Number(line.quantity);
        if (qty <= 0 || qty > batch.quantity) throw new Error(`Invalid return quantity for batch ${batch.batchNumber}`);
        // Default the return's supplier to the batch's supplier if none was chosen explicitly.
        if (!supplierId && batch.supplierId) supplierId = batch.supplierId;
        const amount = qty * batch.purchaseRate;
        totalAmount += amount;
        createItems.push({
          medicineId: Number(line.medicineId),
          batchId: batch.id,
          quantity: qty,
          purchaseRate: batch.purchaseRate,
          amount,
        });
        await tx.medicineBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: qty } } });
        await tx.stockTransaction.create({
          data: { batchId: batch.id, type: "PURCHASE_RETURN", quantity: -qty, reference: "Purchase Return" },
        });
      }

      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          supplierId: supplierId ?? undefined,
          reason: b.reason || undefined,
          totalAmount,
          items: { create: createItems },
        },
        include: { items: { include: { medicine: true, batch: true } }, supplier: true },
      });

      if (supplierId) {
        // Returning stock reduces what the shop owes that supplier.
        await tx.supplier.update({ where: { id: supplierId }, data: { dueAmount: { decrement: totalAmount } } });
      }

      return purchaseReturn;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
