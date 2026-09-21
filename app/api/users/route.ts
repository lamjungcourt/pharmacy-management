import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    await requireAdmin();
    const users = await db.user.findMany({
      select: { id: true, name: true, username: true, role: true, createdAt: true },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(users);
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
    const user = await db.user.create({
      data: {
        name: b.name,
        username: String(b.username).trim().toLowerCase(),
        passwordHash: await hashPassword(b.password),
        role: b.role === "ADMIN" ? "ADMIN" : "CASHIER",
      },
      select: { id: true, name: true, username: true, role: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
