import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/authz";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json(null, { status: 401 });
  // `permissions` is the EFFECTIVE set (admins get everything). The UI uses it to hide menus/buttons;
  // the server re-checks on every API call, so tampering with this in the browser gains nothing.
  return NextResponse.json({ id: ctx.user.id, name: ctx.user.name, role: ctx.user.role, permissions: ctx.permissions });
}
