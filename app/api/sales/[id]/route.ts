import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requireAnyPermission, omitCostFields, canSeeProfit } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Invoices are opened from Billing (print last invoice), Sales History (reprint) and Returns (look up an invoice).
    const ctx = await requireAnyPermission([["salesHistory", "view"], ["billing", "view"], ["returns", "view"]]);
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
    const payload = { sale, settings };
    return NextResponse.json(canSeeProfit(ctx.permissions) ? payload : omitCostFields(payload));
  } catch (e) {
    return apiError(e);
  }
}
