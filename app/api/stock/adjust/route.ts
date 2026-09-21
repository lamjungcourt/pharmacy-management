import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const batchId = Number(b.batchId);
    const delta = Number(b.delta);
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
        data: { batchId, type: "ADJUSTMENT", quantity: delta, reference: b.reason || "Manual adjustment" },
      });
      return updated;
    });
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
