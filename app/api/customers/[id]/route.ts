import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requirePermission } from "@/lib/authz";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("customers", "edit");
    const { id } = await params;
    const b = await req.json();
    const customer = await db.customer.update({
      where: { id: Number(id) },
      data: { name: b.name, phone: b.phone || undefined, address: b.address || undefined, panVat: b.panVat || undefined },
    });
    return NextResponse.json(customer);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("customers", "delete");
    const { id } = await params;
    await db.customer.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
