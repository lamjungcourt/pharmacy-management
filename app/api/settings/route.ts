import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "@/lib/api-error";

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB decoded

export async function GET() {
  const settings = await db.shopSettings.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings ?? {});
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const b = await req.json();

    if (!b.name || !String(b.name).trim()) {
      const e = new Error("Pharmacy name is required") as Error & { status?: number };
      e.status = 400;
      throw e;
    }

    if (b.logoUrl) {
      const isDataUrl = /^data:image\/(png|jpe?g|webp|svg\+xml);base64,/.test(b.logoUrl);
      if (!isDataUrl) {
        const e = new Error("Logo must be an uploaded image") as Error & { status?: number };
        e.status = 400;
        throw e;
      }
      const approxBytes = (b.logoUrl.length * 3) / 4;
      if (approxBytes > MAX_LOGO_BYTES) {
        const e = new Error("Logo image is too large. Please use an image under ~5MB.") as Error & { status?: number };
        e.status = 400;
        throw e;
      }
    }

    const data = {
      name: String(b.name).trim(),
      panVat: b.panVat ?? null,
      regNo: b.regNo ?? null,
      email: b.email ?? null,
      address: b.address ?? null,
      phone: b.phone ?? null,
      logoUrl: b.logoUrl ?? null,
      allowExpiredSales: Boolean(b.allowExpiredSales),
      vatRate: Number(b.vatRate ?? 0),
    };

    const settings = await db.shopSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });
    return NextResponse.json(settings);
  } catch (e) {
    return apiError(e);
  }
}
