import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { isAdminSession, redactBatchesForRole } from "@/lib/authz";

// Full Medicine detail: batches, purchase history (-> supplier), stock transaction
// history, and sales history — everything requirement #7/#8 asks a Medicine page to
// show, all pulled from the real relations instead of being hand-assembled.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const medicineId = Number(id);
    const session = await getSession();
    const admin = isAdminSession(session);

    const medicine = await db.medicine.findUnique({
      where: { id: medicineId },
      include: { batches: { include: { supplier: true }, orderBy: { expiryDate: "asc" } } },
    });
    if (!medicine) {
      const e = new Error("Medicine not found") as Error & { status?: number };
      e.status = 404;
      throw e;
    }

    const purchaseItems = await db.purchaseItem.findMany({
      where: { medicineId },
      include: { purchase: { include: { supplier: true } }, batch: true },
      orderBy: { id: "desc" },
      take: 200,
    });

    const saleItems = await db.saleItem.findMany({
      where: { medicineId },
      include: { sale: { include: { customer: true } }, batch: true },
      orderBy: { id: "desc" },
      take: 200,
    });

    const stockTransactions = await db.stockTransaction.findMany({
      where: { medicineId },
      include: { batch: true, supplier: true, customer: true, user: true },
      orderBy: { id: "desc" },
      take: 300,
    });

    const payload = {
      medicine: { ...medicine, batches: redactBatchesForRole(medicine.batches, admin) },
      purchaseHistory: purchaseItems.map((pi) => ({
        id: pi.id,
        purchaseId: pi.purchaseId,
        invoiceNo: pi.purchase.invoiceNo,
        purchaseDate: pi.purchase.purchaseDate,
        supplier: pi.purchase.supplier ? { id: pi.purchase.supplier.id, name: pi.purchase.supplier.name } : null,
        batch: { id: pi.batch.id, batchNumber: pi.batch.batchNumber, expiryDate: pi.batch.expiryDate },
        quantity: pi.quantity,
        freeQuantity: pi.freeQuantity,
        ...(admin ? { purchaseRate: pi.purchaseRate, discount: pi.discount, vat: pi.vat, amount: pi.amount } : {}),
        sellingRate: pi.sellingRate,
      })),
      salesHistory: saleItems.map((si) => ({
        id: si.id,
        saleId: si.saleId,
        invoiceNo: si.sale.invoiceNo,
        saleDate: si.sale.saleDate,
        customer: si.sale.customer ? { id: si.sale.customer.id, name: si.sale.customer.name } : null,
        batch: { id: si.batch.id, batchNumber: si.batch.batchNumber },
        quantity: si.quantity,
        sellingRate: si.sellingRate,
        amount: si.amount,
        ...(admin ? { purchaseRate: si.purchaseRate, profit: (si.sellingRate - si.purchaseRate) * si.quantity } : {}),
      })),
      stockTransactions: stockTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        quantity: t.quantity,
        quantityIn: t.quantityIn,
        quantityOut: t.quantityOut,
        balanceAfter: t.balanceAfter,
        reference: t.reference,
        batch: { id: t.batch.id, batchNumber: t.batch.batchNumber },
        supplier: t.supplier ? { id: t.supplier.id, name: t.supplier.name } : null,
        customer: t.customer ? { id: t.customer.id, name: t.customer.name } : null,
        user: t.user ? { id: t.user.id, name: t.user.name } : null,
        createdAt: t.createdAt,
      })),
    };

    return NextResponse.json(payload);
  } catch (e) {
    return apiError(e);
  }
}

// Editing the medicine master never touches historical PurchaseItem/SaleItem rows —
// those keep their own snapshot rate fields. Only current-record fields change here.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const b = await req.json();
    const medicine = await db.medicine.update({
      where: { id: Number(id) },
      data: {
        name: b.name,
        genericName: b.genericName || undefined,
        manufacturer: b.manufacturer || undefined,
        category: b.category || undefined,
        dosageForm: b.dosageForm || undefined,
        strength: b.strength || undefined,
        unit: b.unit || undefined,
        barcode: b.barcode || undefined,
        minStock: b.minStock != null ? Number(b.minStock) : undefined,
        reorderLevel: b.reorderLevel != null ? Number(b.reorderLevel) : undefined,
      },
    });
    return NextResponse.json(medicine);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const medicineId = Number(id);
    // Never hard-delete a medicine that has any transaction history — that would
    // corrupt every past purchase/sale that references it. Soft-delete (archive)
    // instead so history stays intact and the medicine just stops appearing as
    // selectable for new transactions.
    const used = await db.purchaseItem.count({ where: { medicineId } });
    const usedInSales = used === 0 ? await db.saleItem.count({ where: { medicineId } }) : 0;
    if (used > 0 || usedInSales > 0) {
      const archived = await db.medicine.update({ where: { id: medicineId }, data: { isActive: false } });
      return NextResponse.json({ ok: true, archived: true, medicine: archived });
    }
    // No history at all yet — safe to actually remove it (and its empty batches).
    await db.medicine.delete({ where: { id: medicineId } });
    return NextResponse.json({ ok: true, archived: false });
  } catch (e) {
    return apiError(e);
  }
}
