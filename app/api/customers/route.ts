import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const customers = await db.customer.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }] }
      : {},
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
    const customer = await db.customer.create({
      data: {
        name: b.name,
        phone: b.phone || undefined,
        address: b.address || undefined,
        panVat: b.panVat || undefined,
        dueAmount: b.dueAmount ? Number(b.dueAmount) : 0,
      },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
