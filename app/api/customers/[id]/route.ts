import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { isAdminSession, redactSaleForRole } from "@/lib/authz";

// Customer profile: info + full sales history + payments (requirement #9).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customerId = Number(id);
    const session = await getSession();
    const admin = isAdminSession(session);

    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      const e = new Error("Customer not found") as Error & { status?: number };
      e.status = 404;
      throw e;
    }

    const sales = await db.sale.findMany({
      where: { customerId },
      include: { items: { include: { medicine: true, batch: true } }, cashier: true },
      orderBy: { id: "desc" },
    });

    const returns = await db.return.findMany({
      where: { sale: { customerId } },
      include: { sale: { select: { invoiceNo: true } }, items: { include: { saleItem: { include: { medicine: true } } } } },
      orderBy: { id: "desc" },
    });

    const payments = await db.customerPayment.findMany({ where: { customerId }, orderBy: { id: "desc" }, take: 100 });

    const safeSales = sales.map((s) => redactSaleForRole(s, admin));
    const totalSales = sales.reduce((s, x) => s + x.total, 0);
    const totalPaid = sales.reduce((s, x) => s + x.paid, 0) + payments.reduce((s, p) => s + p.amount, 0);

    return NextResponse.json({
      customer,
      sales: safeSales,
      returns,
      payments,
      summary: { totalSales, totalPaid, outstanding: customer.dueAmount },
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await req.json();
    const customer = await db.customer.update({
      where: { id: Number(id) },
      data: {
        name: b.name,
        phone: b.phone || undefined,
        address: b.address || undefined,
        email: b.email || undefined,
        panVat: b.panVat || undefined,
      },
    });
    return NextResponse.json(customer);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customerId = Number(id);
    const used = await db.sale.count({ where: { customerId } });
    if (used > 0) {
      const archived = await db.customer.update({ where: { id: customerId }, data: { isActive: false } });
      return NextResponse.json({ ok: true, archived: true, customer: archived });
    }
    await db.customer.delete({ where: { id: customerId } });
    return NextResponse.json({ ok: true, archived: false });
  } catch (e) {
    return apiError(e);
  }
}
