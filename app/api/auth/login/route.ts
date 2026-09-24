import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { createSessionToken, verifyPassword, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { username: String(username).trim().toLowerCase() } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  const token = await createSessionToken({ id: user.id, name: user.name, username: user.username, role: user.role });
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
