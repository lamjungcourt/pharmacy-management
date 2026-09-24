import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requirePermission } from "@/lib/authz";

export async function GET() {
  try {
    await requirePermission("suppliers", "view");
    const payments = await db.supplierPayment.findMany({
      include: { supplier: true },
      orderBy: { id: "desc" },
      take: 100,
    });
    return NextResponse.json(payments);
  } catch (e) {
    return apiError(e);
  }
}
