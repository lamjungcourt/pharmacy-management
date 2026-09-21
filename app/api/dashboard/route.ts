import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const batches = await db.medicineBatch.findMany({ include: { medicine: true } });
  const low = batches.filter((b) => b.quantity <= b.medicine.minStock);
  const expired = batches.filter((b) => b.expiryDate < now && b.quantity > 0);
  const soon = batches.filter(
    (b) => b.expiryDate >= now && b.expiryDate.getTime() - now.getTime() <= 90 * 86400000 && b.quantity > 0
  );

  const todaySales = await db.sale.findMany({
    where: { saleDate: { gte: startOfDay }, cancelled: false },
    include: { items: true },
  });
  const monthSales = await db.sale.findMany({
    where: { saleDate: { gte: startOfMonth }, cancelled: false },
    include: { items: true },
  });
  const todayPurchases = await db.purchase.findMany({ where: { purchaseDate: { gte: startOfDay } } });
  const monthPurchases = await db.purchase.findMany({ where: { purchaseDate: { gte: startOfMonth } } });

  const totalStock = batches.reduce((s, b) => s + b.quantity, 0);
  const stockValue = batches.reduce((s, b) => s + b.quantity * b.purchaseRate, 0);
  const profitOf = (sales: typeof todaySales) =>
    sales.reduce((s, x) => s + x.items.reduce((p, i) => p + (i.sellingRate - i.purchaseRate) * i.quantity, 0), 0);

  const supplierDueAgg = await db.supplier.aggregate({ _sum: { dueAmount: true } });
  const customerDueAgg = await db.customer.aggregate({ _sum: { dueAmount: true } });

  return NextResponse.json({
    todaySales: todaySales.reduce((s, x) => s + x.total, 0),
    todayBills: todaySales.length,
    todayProfit: profitOf(todaySales),
    todayPurchases: todayPurchases.reduce((s, x) => s + x.totalAmount, 0),
    todayPurchaseCount: todayPurchases.length,
    monthSales: monthSales.reduce((s, x) => s + x.total, 0),
    monthBills: monthSales.length,
    monthProfit: profitOf(monthSales),
    monthPurchases: monthPurchases.reduce((s, x) => s + x.totalAmount, 0),
    monthPurchaseCount: monthPurchases.length,
    totalMedicines: await db.medicine.count(),
    totalStock,
    stockValue,
    lowStock: low.length,
    expired: expired.length,
    expiringSoon: soon.length,
    totalSupplierDue: supplierDueAgg._sum.dueAmount ?? 0,
    totalCustomerDue: customerDueAgg._sum.dueAmount ?? 0,
  });
}
