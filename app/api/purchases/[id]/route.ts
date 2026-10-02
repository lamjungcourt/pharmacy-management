import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

// Single purchase, fully expanded — this is what backs the printable Purchase
// Invoice (requirement #10) and the "click a purchase -> full detail" navigation.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const purchase = await db.purchase.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: true,
        createdBy: true,
        items: { include: { medicine: true, batch: true } },
        payments: true,
      },
    });
    if (!purchase) {
      const e = new Error("Purchase not found") as Error & { status?: number };
      e.status = 404;
      throw e;
    }
    const settings = await db.shopSettings.findUnique({ where: { id: 1 } });
    return NextResponse.json({ purchase, settings });
  } catch (e) {
    return apiError(e);
  }
}

// Editing a purchase (requirement #14): the old stock effect of every line is fully
// reversed, then the new lines are re-applied — all inside one transaction — instead
// of only patching the Purchase row and leaving stock/supplier balances stale.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const purchaseId = Number(id);
    const b = await req.json();

    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.purchase.findUnique({ where: { id: purchaseId }, include: { items: true } });
      if (!existing) throw new Error("Purchase not found");
      if (existing.status === "CANCELLED") throw new Error("This purchase was cancelled and cannot be edited");

      // Step 1: reverse the stock effect of every existing line.
      for (const oldItem of existing.items) {
        const qtyOld = oldItem.quantity + oldItem.freeQuantity;
        const batch = await tx.medicineBatch.findUnique({ where: { id: oldItem.batchId } });
        if (!batch) continue;
        if (batch.quantity - qtyOld < 0) {
          throw new Error(
            `Cannot edit: reversing batch "${batch.batchNumber}" would make stock negative (some of this batch has already been sold or moved).`
          );
        }
        await tx.medicineBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: qtyOld } } });
      }
      await tx.stockTransaction.deleteMany({ where: { purchaseId } });
      await tx.purchaseItem.deleteMany({ where: { purchaseId } });

      const supplierId = b.supplierId ? Number(b.supplierId) : existing.supplierId ?? undefined;
      const items: any[] = [];
      let subtotal = 0, discountTotal = 0, vatTotal = 0;

      for (const i of b.items) {
        const med = await tx.medicine.findUnique({ where: { id: Number(i.medicineId) } });
        if (!med) throw new Error("Medicine not found");
        const qty = Number(i.quantity);
        const freeQty = Number(i.freeQuantity || 0);
        const purchaseRate = Number(i.purchaseRate);
        const sellingRate = Number(i.sellingRate ?? purchaseRate);
        const discount = Number(i.discount || 0);
        const vat = Number(i.vat || 0);
        const lineGross = qty * purchaseRate;
        subtotal += lineGross; discountTotal += discount; vatTotal += vat;

        let batch = await tx.medicineBatch.findUnique({
          where: { medicineId_batchNumber: { medicineId: med.id, batchNumber: i.batchNumber } },
        });
        const incomingQty = qty + freeQty;
        if (batch) {
          batch = await tx.medicineBatch.update({
            where: { id: batch.id },
            data: { quantity: { increment: incomingQty }, purchaseRate, sellingRate, expiryDate: new Date(i.expiryDate), supplierId },
          });
        } else {
          batch = await tx.medicineBatch.create({
            data: { medicineId: med.id, batchNumber: i.batchNumber, quantity: incomingQty, purchaseRate, sellingRate, expiryDate: new Date(i.expiryDate), supplierId },
          });
        }
        items.push({ medicineId: med.id, batchId: batch.id, quantity: qty, freeQuantity: freeQty, purchaseRate, sellingRate, discount, vat, amount: lineGross - discount + vat });
      }

      const totalAmount = subtotal - discountTotal + vatTotal;
      let paidAmount = Number(b.paidAmount ?? existing.paidAmount);
      if (paidAmount < 0) paidAmount = 0;
      if (paidAmount > totalAmount) paidAmount = totalAmount;

      const paymentType = b.paymentType === "CREDIT" ? "CREDIT" : b.paymentType === "CASH" ? "CASH" : existing.paymentType;
      const paidDate = b.paidDate ? new Date(b.paidDate) : (paymentType === "CASH" ? existing.paidDate ?? existing.purchaseDate : existing.paidDate);
      const creditDueDate = paymentType === "CREDIT" ? (b.creditDueDate ? new Date(b.creditDueDate) : existing.creditDueDate) : null;

      const updated = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          supplierId,
          invoiceNo: b.invoiceNo ?? existing.invoiceNo,
          purchaseDate: b.purchaseDate ? new Date(b.purchaseDate) : existing.purchaseDate,
          subtotal, discountAmount: discountTotal, vatAmount: vatTotal, totalAmount, paidAmount,
          paymentType, paidDate, creditDueDate,
          invoiceFileUrl: b.invoiceFileUrl !== undefined ? (b.invoiceFileUrl || null) : existing.invoiceFileUrl,
          invoiceFileName: b.invoiceFileName !== undefined ? (b.invoiceFileName || null) : existing.invoiceFileName,
          notes: b.notes ?? existing.notes,
          items: { create: items },
        },
        include: { items: { include: { medicine: true, batch: true } }, supplier: true },
      });

      for (const created of updated.items) {
        const qtyIn = created.quantity + created.freeQuantity;
        await tx.stockTransaction.create({
          data: {
            medicineId: created.medicineId, batchId: created.batchId, type: "PURCHASE",
            quantity: qtyIn, quantityIn: qtyIn, balanceAfter: created.batch.quantity,
            reference: `${updated.invoiceNo ?? `Purchase #${updated.id}`} (edited)`,
            supplierId: supplierId ?? undefined, purchaseId: updated.id, userId: session.id,
          },
        });
      }

      // Reconcile supplier due: remove the old purchase's net effect, apply the new one.
      if (existing.supplierId) {
        await tx.supplier.update({ where: { id: existing.supplierId }, data: { dueAmount: { decrement: existing.totalAmount - existing.paidAmount } } });
      }
      if (supplierId) {
        await tx.supplier.update({ where: { id: supplierId }, data: { dueAmount: { increment: totalAmount - paidAmount } } });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}

// Void a purchase (soft): blocked if any of its stock has already moved on, since
// reversing it would otherwise silently create negative/incorrect stock.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const purchaseId = Number(id);
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const purchase = await tx.purchase.findUnique({ where: { id: purchaseId }, include: { items: true } });
      if (!purchase) throw new Error("Purchase not found");
      for (const item of purchase.items) {
        const qty = item.quantity + item.freeQuantity;
        const batch = await tx.medicineBatch.findUnique({ where: { id: item.batchId } });
        if (!batch || batch.quantity - qty < 0) {
          throw new Error("Cannot void: some of this purchase's stock has already been sold, returned, or moved.");
        }
      }
      for (const item of purchase.items) {
        const qty = item.quantity + item.freeQuantity;
        await tx.medicineBatch.update({ where: { id: item.batchId }, data: { quantity: { decrement: qty } } });
        await tx.stockTransaction.create({
          data: {
            medicineId: item.medicineId, batchId: item.batchId, type: "ADJUSTMENT",
            quantity: -qty, quantityOut: qty,
            reference: `Void of ${purchase.invoiceNo ?? `Purchase #${purchase.id}`}`,
            purchaseId: purchase.id,
          },
        });
      }
      if (purchase.supplierId) {
        await tx.supplier.update({ where: { id: purchase.supplierId }, data: { dueAmount: { decrement: purchase.totalAmount - purchase.paidAmount } } });
      }
      return tx.purchase.update({ where: { id: purchaseId }, data: { status: "CANCELLED" } });
    });
    return NextResponse.json({ ok: true, purchase: result });
  } catch (e) {
    return apiError(e);
  }
}
