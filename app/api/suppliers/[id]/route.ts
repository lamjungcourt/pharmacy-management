import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

// Full Supplier profile: info + every purchase from this supplier (each with its
// medicines/batches), plus payments — the "Supplier -> Purchases -> Medicine" side
// of the two-way navigation the spec asks for. This route is only reachable by an
// Admin session (see middleware.ts), which is also what keeps its purchaseRate/
// totalAmount figures away from a Cashier.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supplierId = Number(id);
    const { searchParams } = new URL(req.url);
    const medicineId = searchParams.get("medicineId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const invoiceNo = searchParams.get("invoiceNo");

    const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      const e = new Error("Supplier not found") as Error & { status?: number };
      e.status = 404;
      throw e;
    }

    const purchases = await db.purchase.findMany({
      where: {
        supplierId,
        purchaseDate: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to + "T23:59:59") : undefined },
        invoiceNo: invoiceNo ? { contains: invoiceNo, mode: "insensitive" } : undefined,
        items: medicineId ? { some: { medicineId: Number(medicineId) } } : undefined,
      },
      include: { items: { include: { medicine: true, batch: true } } },
      orderBy: { id: "desc" },
    });

    const payments = await db.supplierPayment.findMany({
      where: { supplierId },
      orderBy: { id: "desc" },
      take: 100,
    });

    const activePurchases = purchases.filter((p) => p.status !== "CANCELLED");
    const totalPurchased = activePurchases.reduce((s, p) => s + p.totalAmount, 0);
    const totalPaid = activePurchases.reduce((s, p) => s + p.paidAmount, 0);

    return NextResponse.json({
      supplier,
      purchases,
      payments,
      summary: { totalPurchased, totalPaid, totalDue: totalPurchased - totalPaid, currentBalance: supplier.dueAmount },
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await req.json();
    const supplier = await db.supplier.update({
      where: { id: Number(id) },
      data: {
        name: b.name,
        company: b.company || undefined,
        contactPerson: b.contactPerson || undefined,
        phone: b.phone || undefined,
        address: b.address || undefined,
        panVat: b.panVat || undefined,
        pan: b.pan || undefined,
        vatNo: b.vatNo || undefined,
        regNo: b.regNo || undefined,
        paymentTerms: b.paymentTerms || undefined,
        email: b.email || undefined,
        notes: b.notes || undefined,
      },
    });
    return NextResponse.json(supplier);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supplierId = Number(id);
    const used = await db.purchase.count({ where: { supplierId } });
    if (used > 0) {
      // Preserve purchase history integrity — archive instead of deleting.
      const archived = await db.supplier.update({ where: { id: supplierId }, data: { isActive: false } });
      return NextResponse.json({ ok: true, archived: true, supplier: archived });
    }
    await db.supplier.delete({ where: { id: supplierId } });
    return NextResponse.json({ ok: true, archived: false });
  } catch (e) {
    return apiError(e);
  }
}
