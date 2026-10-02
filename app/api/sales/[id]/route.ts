import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { isAdminSession, redactSaleForRole } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const admin = isAdminSession(session);
    const { id } = await params;
    const sale = await db.sale.findFirst({
      where: { OR: [{ id: Number(id) || -1 }, { invoiceNo: id }] },
      include: {
        customer: true,
        cashier: true,
        items: { include: { medicine: true, batch: true } },
      },
    });
    if (!sale) {
      const e = new Error("Sale not found") as Error & { status?: number };
      e.status = 404;
      throw e;
    }
    const settings = await db.shopSettings.findUnique({ where: { id: 1 } });
    return NextResponse.json({ sale: redactSaleForRole(sale, admin), settings });
  } catch (e) {
    return apiError(e);
  }
}
