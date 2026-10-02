import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customerId = Number(id);
    const b = await req.json();
    const amount = Number(b.amount);
    if (!amount || amount <= 0) {
      const e = new Error("Enter a valid payment amount") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const customer = await tx.customer.update({
        where: { id: customerId },
        data: { dueAmount: { decrement: amount } },
      });
      const payment = await tx.customerPayment.create({
        data: { customerId, amount, note: b.note || "Cash received from customer" },
      });
      return { customer, payment };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
