import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requirePermission, omitCostFields, canSeeProfit } from "@/lib/authz";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const ctx = await requirePermission("returns", "view");
    const returns = await db.return.findMany({
      include: {
        sale: { select: { invoiceNo: true } },
        items: { include: { saleItem: { include: { medicine: true, batch: true } } } },
      },
      orderBy: { id: "desc" },
      take: 200,
    });
    // Sale items / batches carry buy rates — only send them to users allowed to see cost data.
    return NextResponse.json(canSeeProfit(ctx.permissions) ? returns : omitCostFields(returns));
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("returns", "add");
    const b = await req.json();
    const sale = await db.sale.findFirst({
      where: { invoiceNo: b.invoiceNo },
      include: { items: true },
    });
    if (!sale) {
      const e = new Error("Invoice not found") as Error & { status?: number };
      e.status = 404;
      throw e;
    }
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      let totalAmount = 0;
      const items: { saleItemId: number; quantity: number; amount: number }[] = [];
      for (const line of b.items as { saleItemId: number; quantity: number }[]) {
        const saleItem = sale.items.find((i) => i.id === Number(line.saleItemId));
        if (!saleItem) throw new Error("Sale item not found on this invoice");
        const qty = Number(line.quantity);
        if (qty <= 0 || qty > saleItem.quantity) throw new Error(`Invalid return quantity for item #${saleItem.id}`);
        const amount = qty * saleItem.sellingRate;
        totalAmount += amount;
        items.push({ saleItemId: saleItem.id, quantity: qty, amount });
        await tx.medicineBatch.update({ where: { id: saleItem.batchId }, data: { quantity: { increment: qty } } });
        await tx.stockTransaction.create({
          data: { batchId: saleItem.batchId, type: "RETURN", quantity: qty, reference: sale.invoiceNo },
        });
      }
      if (!items.length) throw new Error("At least one return line is required");
      return tx.return.create({
        data: { saleId: sale.id, reason: b.reason || undefined, totalAmount, items: { create: items } },
        include: { items: { include: { saleItem: { include: { medicine: true } } } } },
      });
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
