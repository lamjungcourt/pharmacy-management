import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requirePermission } from "@/lib/authz";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("suppliers", "edit"); // recording a payment changes the supplier's balance
    const { id } = await params;
    const supplierId = Number(id);
    const b = await req.json();
    const amount = Number(b.amount);
    if (!amount || amount <= 0) {
      const e = new Error("Enter a valid payment amount") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const supplier = await tx.supplier.update({
        where: { id: supplierId },
        data: { dueAmount: { decrement: amount } },
      });
      const payment = await tx.supplierPayment.create({
        data: { supplierId, amount, receiptNo: b.receiptNo || undefined, note: b.note || "Cash paid to supplier" },
      });
      return { supplier, payment };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
