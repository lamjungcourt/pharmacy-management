import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getSession, requireSession } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { isAdminSession, redactSaleItemForRole } from "@/lib/authz";
import type { Prisma } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  const admin = isAdminSession(session);
  const returns = await db.return.findMany({
    include: {
      sale: { select: { invoiceNo: true } },
      items: { include: { saleItem: { include: { medicine: true, batch: true } } } },
    },
    orderBy: { id: "desc" },
    take: 200,
  });
  // Sale return lines carry the original sale item, which includes purchaseRate
  // (cost). Strip it for a Cashier session the same way sales history does.
  const safe = admin
    ? returns
    : returns.map((r) => ({
        ...r,
        items: r.items.map((it) => ({ ...it, saleItem: redactSaleItemForRole(it.saleItem as any, admin) })),
      }));
  return NextResponse.json(safe);
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
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
        const updatedBatch = await tx.medicineBatch.update({ where: { id: saleItem.batchId }, data: { quantity: { increment: qty } } });
        await tx.stockTransaction.create({
          data: {
            medicineId: saleItem.medicineId,
            batchId: saleItem.batchId,
            type: "RETURN",
            quantity: qty,
            quantityIn: qty,
            balanceAfter: updatedBatch.quantity,
            reference: sale.invoiceNo,
            customerId: sale.customerId ?? undefined,
            saleId: sale.id,
            userId: session.id,
          },
        });
      }
      if (!items.length) throw new Error("At least one return line is required");
      return tx.return.create({
        data: { saleId: sale.id, reason: b.reason || undefined, totalAmount, items: { create: items } },
        include: { items: { include: { saleItem: { include: { medicine: true } } } } },
      });
    });
    const admin = isAdminSession(session);
    const safeResult = admin
      ? result
      : { ...result, items: result.items.map((it) => ({ ...it, saleItem: redactSaleItemForRole(it.saleItem as any, admin) })) };
    return NextResponse.json(safeResult, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
