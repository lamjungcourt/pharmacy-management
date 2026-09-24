import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requirePermission } from "@/lib/authz";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("suppliers", "edit");
    const { id } = await params;
    const b = await req.json();
    const supplier = await db.supplier.update({
      where: { id: Number(id) },
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
    return NextResponse.json(supplier);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("suppliers", "delete");
    const { id } = await params;
    await db.supplier.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
