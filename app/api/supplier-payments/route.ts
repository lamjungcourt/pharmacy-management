import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
  const payments = await db.supplierPayment.findMany({
    include: { supplier: true },
    orderBy: { id: "desc" },
    take: 100,
  });
  return NextResponse.json(payments);
}
