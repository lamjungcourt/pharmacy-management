import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const includeInactive = searchParams.get("includeInactive") === "1";
  const suppliers = await db.supplier.findMany({
    where: {
      AND: [
        includeInactive ? {} : { isActive: true },
        q
          ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }] }
          : {},
      ],
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(suppliers);
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.name) {
      const e = new Error("Name is required") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    const openingBalance = Number(b.openingBalance ?? 0);
    const supplier = await db.supplier.create({
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
        openingBalance,
        dueAmount: openingBalance,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
