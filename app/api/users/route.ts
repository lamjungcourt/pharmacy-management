import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { defaultUserPermissions, resolvePermissions, sanitizePermissions } from "@/lib/permissions";

export async function GET() {
  try {
    await requireAdmin();
    const users = await db.user.findMany({
      select: { id: true, name: true, username: true, role: true, permissions: true, createdAt: true },
      orderBy: { id: "asc" },
    });
    // Return the EFFECTIVE permissions (admins = everything, never-customised users = the default preset).
    return NextResponse.json(
      users.map(({ permissions, ...u }) => ({ ...u, permissions: resolvePermissions(u.role, permissions) }))
    );
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const b = await req.json();
    if (!b.name || !b.username || !b.password) {
      const e = new Error("Name, username and password are required") as Error & { status?: number };
      e.status = 400;
      throw e;
    }
    const permissions = b.permissions === undefined ? defaultUserPermissions() : sanitizePermissions(b.permissions);
    const user = await db.user.create({
      data: {
        name: b.name,
        username: String(b.username).trim().toLowerCase(),
        passwordHash: await hashPassword(b.password),
        role: b.role === "ADMIN" ? "ADMIN" : "CASHIER",
        permissions: permissions as Prisma.InputJsonObject,
      },
      select: { id: true, name: true, username: true, role: true, permissions: true },
    });
    return NextResponse.json(
      { ...user, permissions: resolvePermissions(user.role, user.permissions) },
      { status: 201 }
    );
  } catch (e) {
    return apiError(e);
  }
}
