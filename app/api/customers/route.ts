import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const includeInactive = searchParams.get("includeInactive") === "1";
  const customers = await db.customer.findMany({
    where: {
      AND: [
        includeInactive ? {} : { isActive: true },
        q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }] } : {},
      ],
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.name) {
      const e = new Error("Name is required") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    const openingBalance = Number(b.openingBalance ?? b.dueAmount ?? 0);
    const customer = await db.customer.create({
      data: {
        name: b.name,
        phone: b.phone || undefined,
        address: b.address || undefined,
        email: b.email || undefined,
        panVat: b.panVat || undefined,
        openingBalance,
        dueAmount: openingBalance,
      },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
