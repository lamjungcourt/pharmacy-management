import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requireAnyPermission, requirePermission } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    // Purchases / Purchase Returns need the supplier dropdown, so those permissions can read the list too.
    await requireAnyPermission([["suppliers", "view"], ["purchases", "view"], ["purchaseReturns", "view"]]);
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const suppliers = await db.supplier.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }] }
        : {},
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("suppliers", "add");
    const b = await req.json();
    if (!b.name) {
      const e = new Error("Name is required") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    const supplier = await db.supplier.create({
      data: {
        name: b.name,
        company: b.company || undefined,
        phone: b.phone || undefined,
        address: b.address || undefined,
        panVat: b.panVat || undefined,
        email: b.email || undefined,
        notes: b.notes || undefined,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
