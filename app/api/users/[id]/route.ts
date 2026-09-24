import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { hashPassword, getSession, requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";
import { resolvePermissions, sanitizePermissions } from "@/lib/permissions";

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
    // Admin can set exactly what this user may access. Input is sanitised (unknown modules/actions dropped,
    // add/edit/delete imply view). Admin accounts always have full access, so nothing is stored for them.
    if (b.permissions !== undefined) {
      const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (target?.role === "ADMIN") {
        const e = new Error("Admin accounts always have full access — permissions can't be restricted.") as Error & { status?: number };
        e.status = 400;
        throw e;
      }
      data.permissions = sanitizePermissions(b.permissions) as Prisma.InputJsonObject;
    }
    const user = await db.user.update({
      where: { id: Number(id) },
      data,
      select: { id: true, name: true, username: true, role: true, permissions: true },
    });
    return NextResponse.json({ ...user, permissions: resolvePermissions(user.role, user.permissions) });
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
