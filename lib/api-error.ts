import { NextResponse } from "next/server";

export function apiError(e: unknown) {
  const err = e as Error & { status?: number; code?: string; meta?: { target?: string[]; field_name?: string } };
  if (err.code === "P2002") {
    const field = err.meta?.target?.join(", ") ?? "value";
    return NextResponse.json({ error: `That ${field} is already in use.` }, { status: 409 });
  }
  if (err.code === "P2025") {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }
  if (err.code === "P2003" || err.code === "P2014") {
    return NextResponse.json(
      { error: "This can't be deleted because it's already used in existing sales, purchases, or stock records." },
      { status: 409 }
    );
  }
  const status = err.status ?? 400;
  const message = err.message || "Something went wrong";
  return NextResponse.json({ error: message }, { status });
}
