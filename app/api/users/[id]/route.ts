import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { hashPassword, getSession, requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const userId = Number(id);
    const b = await req.json();
    const data: Record<string, unknown> = {};
    if (b.name) data.name = b.name;
    if (b.role === "ADMIN" || b.role === "CASHIER") {
      if (b.role === "CASHIER") {
        const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (target?.role === "ADMIN") {
          const e = new Error("Admin accounts are permanent and cannot be demoted.") as Error & { status?: number };
          e.status = 400;
          throw e;
        }
      }
      data.role = b.role;
    }
    if (b.password) data.passwordHash = await hashPassword(b.password);
    const user = await db.user.update({
      where: { id: Number(id) },
      data,
      select: { id: true, name: true, username: true, role: true },
    });
    return NextResponse.json(user);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const userId = Number(id);
    const session = await getSession();
    if (session?.id === userId) {
      const e = new Error("You cannot delete your own account while signed in.") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (target?.role === "ADMIN") {
      const e = new Error("Admin accounts are permanent and cannot be deleted.") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    await db.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
