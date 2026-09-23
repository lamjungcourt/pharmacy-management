import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    // Deleting the medicine also removes its batches (onDelete: Cascade in the schema).
    // If any batch was ever used in a sale, purchase, or return, the delete is blocked
    // (see apiError P2003/P2014 handling) to protect historical records.
    await db.medicine.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
