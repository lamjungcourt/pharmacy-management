import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requireAnyPermission, requirePermission } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    // The POS needs the customer list too, so Billing access is enough to read it.
    await requireAnyPermission([["customers", "view"], ["billing", "view"]]);
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const customers = await db.customer.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }] }
        : {},
      orderBy: { name: "asc" },
    });
    return NextResponse.json(customers);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("customers", "add");
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
