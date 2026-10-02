import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const b = await req.json();
    const batchId = Number(b.batchId);
    const delta = Number(b.delta);
    // Adjustment type defaults to ADJUSTMENT, but damaged/expired stock write-offs are
    // tracked as their own StockTransaction type so reports/history can tell them apart.
    const type = b.type === "DAMAGED" || b.type === "EXPIRED" ? b.type : "ADJUSTMENT";
    if (!batchId || !delta) {
      const e = new Error("batchId and a non-zero delta are required") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const batch = await tx.medicineBatch.findUnique({ where: { id: batchId } });
      if (!batch) throw new Error("Batch not found");
      if (batch.quantity + delta < 0) throw new Error("Adjustment would make stock negative");
      const updated = await tx.medicineBatch.update({
        where: { id: batchId },
        data: { quantity: { increment: delta } },
      });
      await tx.stockTransaction.create({
        data: {
          medicineId: batch.medicineId,
          batchId,
          type,
          quantity: delta,
          quantityIn: delta > 0 ? delta : 0,
          quantityOut: delta < 0 ? -delta : 0,
          balanceAfter: updated.quantity,
          reference: b.reason || "Manual adjustment",
          userId: session.id,
        },
      });
      return updated;
    });
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
