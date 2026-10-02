import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const supplierId = searchParams.get("supplierId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const purchases = await db.purchase.findMany({
    where: {
      AND: [
        supplierId ? { supplierId: Number(supplierId) } : {},
        from ? { purchaseDate: { gte: new Date(from) } } : {},
        to ? { purchaseDate: { lte: new Date(to + "T23:59:59") } } : {},
        q
          ? {
              OR: [
                { invoiceNo: { contains: q, mode: "insensitive" } },
                { supplier: { name: { contains: q, mode: "insensitive" } } },
                { items: { some: { medicine: { name: { contains: q, mode: "insensitive" } } } } },
              ],
            }
          : {},
      ],
    },
    include: { supplier: true, items: { include: { medicine: true, batch: true } } },
    orderBy: { id: "desc" },
    take: 200,
  });
  return NextResponse.json(purchases);
}

// Purchase creation is the canonical example of requirement #13 (data consistency):
// Purchase -> PurchaseItem -> Medicine/Batch -> Stock -> StockTransaction -> Supplier
// balance all have to succeed or fail together, which is why the whole thing runs
// inside a single $transaction.
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const b = await req.json();
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const supplierId = b.supplierId ? Number(b.supplierId) : undefined;

      if (b.invoiceNo && supplierId) {
        const dup = await tx.purchase.findFirst({ where: { supplierId, invoiceNo: b.invoiceNo } });
        if (dup) throw new Error(`Invoice ${b.invoiceNo} already recorded for this supplier`);
      }

      const items: any[] = [];
      let subtotal = 0;
      let discountTotal = 0;
      let vatTotal = 0;

      for (const i of b.items) {
        // Always resolve to the existing Medicine record by id — never create a
        // second, disconnected medicine here (requirement #1/#4).
        const med = await tx.medicine.findUnique({ where: { id: Number(i.medicineId) } });
        if (!med) throw new Error("Medicine not found");

        const qty = Number(i.quantity);
        const freeQty = Number(i.freeQuantity || 0);
        const purchaseRate = Number(i.purchaseRate);
        const sellingRate = Number(i.sellingRate ?? purchaseRate);
        const lineGross = qty * purchaseRate;
        const discount = Number(i.discount || 0);
        const vat = Number(i.vat || 0);
        const lineAmount = lineGross - discount + vat;
        subtotal += lineGross;
        discountTotal += discount;
        vatTotal += vat;

        let batch = await tx.medicineBatch.findUnique({
          where: { medicineId_batchNumber: { medicineId: med.id, batchNumber: i.batchNumber } },
        });
        const incomingQty = qty + freeQty;
        if (batch) {
          // Same medicine + batch number already exists: add to it rather than
          // creating a duplicate batch record, and refresh its current rates.
          batch = await tx.medicineBatch.update({
            where: { id: batch.id },
            data: {
              quantity: { increment: incomingQty },
              purchaseRate,
              sellingRate,
              expiryDate: new Date(i.expiryDate),
              supplierId: supplierId ?? batch.supplierId,
            },
          });
        } else {
          batch = await tx.medicineBatch.create({
            data: {
              medicineId: med.id,
              batchNumber: i.batchNumber,
              quantity: incomingQty,
              purchaseRate,
              sellingRate,
              expiryDate: new Date(i.expiryDate),
              supplierId,
            },
          });
        }

        items.push({
          medicineId: med.id,
          batchId: batch.id,
          quantity: qty,
          freeQuantity: freeQty,
          purchaseRate,
          sellingRate,
          discount,
          vat,
          amount: lineAmount,
        });
      }

      const totalAmount = subtotal - discountTotal + vatTotal;
      let paidAmount = Number(b.paidAmount ?? 0);
      if (paidAmount < 0) paidAmount = 0;
      if (paidAmount > totalAmount) paidAmount = totalAmount;

      const paymentType = b.paymentType === "CREDIT" ? "CREDIT" : "CASH";
      // Cash: record the date money actually changed hands (defaults to today).
      // Credit: record when the vendor expects to be paid, if given.
      const paidDate = paymentType === "CASH" ? new Date(b.paidDate || b.purchaseDate || Date.now()) : (b.paidDate ? new Date(b.paidDate) : null);
      const creditDueDate = paymentType === "CREDIT" && b.creditDueDate ? new Date(b.creditDueDate) : null;

      const purchase = await tx.purchase.create({
        data: {
          supplierId,
          invoiceNo: b.invoiceNo || undefined,
          purchaseDate: b.purchaseDate ? new Date(b.purchaseDate) : undefined,
          subtotal,
          discountAmount: discountTotal,
          vatAmount: vatTotal,
          totalAmount,
          paidAmount,
          paymentType,
          paidDate,
          creditDueDate,
          invoiceFileUrl: b.invoiceFileUrl || undefined,
          invoiceFileName: b.invoiceFileName || undefined,
          notes: b.notes || undefined,
          createdById: session.id,
          items: { create: items },
        },
        include: { items: { include: { medicine: true, batch: true } }, supplier: true },
      });

      // One StockTransaction per line, fully attributed (medicine, batch, supplier,
      // purchase, user) and carrying the running batch balance — this feeds Medicine
      // Stock History (requirement #8) without any hand-typed data.
      for (const created of purchase.items) {
        const qtyIn = created.quantity + created.freeQuantity;
        await tx.stockTransaction.create({
          data: {
            medicineId: created.medicineId,
            batchId: created.batchId,
            type: "PURCHASE",
            quantity: qtyIn,
            quantityIn: qtyIn,
            balanceAfter: created.batch.quantity,
            reference: purchase.invoiceNo ?? `Purchase #${purchase.id}`,
            supplierId: supplierId ?? undefined,
            purchaseId: purchase.id,
            userId: session.id,
          },
        });
      }

      if (supplierId) {
        await tx.supplier.update({ where: { id: supplierId }, data: { dueAmount: { increment: totalAmount - paidAmount } } });
        if (paidAmount > 0) {
          await tx.supplierPayment.create({
            data: { supplierId, purchaseId: purchase.id, amount: paidAmount, note: paymentType === "CASH" ? "Cash paid at purchase" : "Partial payment at purchase (credit)", paidDate: paidDate ?? undefined },
          });
        }
      }

      return purchase;
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
