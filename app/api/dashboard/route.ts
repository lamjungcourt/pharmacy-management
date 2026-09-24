import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requirePermission, canSeeProfit } from "@/lib/authz";

export async function GET() {
  try {
    const ctx = await requirePermission("dashboard", "view");
    const showProfit = canSeeProfit(ctx.permissions);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1); // calendar year (Jan–Dec), same as the Reports "Yearly" view

    const batches = await db.medicineBatch.findMany({ include: { medicine: true } });
    const low = batches.filter((b) => b.quantity <= b.medicine.minStock);
    const expired = batches.filter((b) => b.expiryDate < now && b.quantity > 0);
    const soon = batches.filter(
      (b) => b.expiryDate >= now && b.expiryDate.getTime() - now.getTime() <= 90 * 86400000 && b.quantity > 0
    );

    // One query for the whole year; today and this month are subsets of it.
    const yearSales = await db.sale.findMany({
      where: { saleDate: { gte: startOfYear }, cancelled: false },
      select: {
        saleDate: true,
        total: true,
        items: { select: { quantity: true, sellingRate: true, purchaseRate: true } },
      },
    });
    const todaySales = yearSales.filter((s) => s.saleDate >= startOfDay);
    const monthSales = yearSales.filter((s) => s.saleDate >= startOfMonth);

    const yearPurchases = await db.purchase.findMany({
      where: { purchaseDate: { gte: startOfYear } },
      select: { purchaseDate: true, totalAmount: true },
    });
    const todayPurchases = yearPurchases.filter((p) => p.purchaseDate >= startOfDay);
    const monthPurchases = yearPurchases.filter((p) => p.purchaseDate >= startOfMonth);

    const totalStock = batches.reduce((s, b) => s + b.quantity, 0);
    const sumTotal = (rows: { total: number }[]) => rows.reduce((s, x) => s + x.total, 0);
    const sumPurchases = (rows: { totalAmount: number }[]) => rows.reduce((s, x) => s + x.totalAmount, 0);

    const supplierDueAgg = await db.supplier.aggregate({ _sum: { dueAmount: true } });
    const customerDueAgg = await db.customer.aggregate({ _sum: { dueAmount: true } });

    const body: Record<string, unknown> = {
      todaySales: sumTotal(todaySales),
      todayBills: todaySales.length,
      todayPurchases: sumPurchases(todayPurchases),
      todayPurchaseCount: todayPurchases.length,
      monthSales: sumTotal(monthSales),
      monthBills: monthSales.length,
      monthPurchases: sumPurchases(monthPurchases),
      monthPurchaseCount: monthPurchases.length,
      yearSales: sumTotal(yearSales),
      yearBills: yearSales.length,
      yearPurchases: sumPurchases(yearPurchases),
      yearPurchaseCount: yearPurchases.length,
      totalMedicines: await db.medicine.count(),
      totalStock,
      lowStock: low.length,
      expired: expired.length,
      expiringSoon: soon.length,
      totalSupplierDue: supplierDueAgg._sum.dueAmount ?? 0,
      totalCustomerDue: customerDueAgg._sum.dueAmount ?? 0,
    };

    // Profit + cost-based figures are ONLY computed and attached for users with the Profit permission
    // (admins always have it). Everyone else gets a response with no such fields at all.
    if (showProfit) {
      const profitOf = (sales: typeof yearSales) =>
        sales.reduce((s, x) => s + x.items.reduce((p, i) => p + (i.sellingRate - i.purchaseRate) * i.quantity, 0), 0);
      body.financial = {
        todayProfit: profitOf(todaySales),
        monthProfit: profitOf(monthSales),
        yearProfit: profitOf(yearSales),
        stockValue: batches.reduce((s, b) => s + b.quantity * b.purchaseRate, 0),
      };
    }

    return NextResponse.json(body);
  } catch (e) {
    return apiError(e);
  }
}
