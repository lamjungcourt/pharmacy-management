import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { requirePermission, canSeeProfit } from "@/lib/authz";

function periodKey(d: Date, groupBy: "day" | "month" | "year") {
  const y = d.getFullYear();
  if (groupBy === "year") return `${y}`;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  if (groupBy === "month") return `${y}-${m}`;
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  try {
  const ctx = await requirePermission("reports", "view");
  const showProfit = canSeeProfit(ctx.permissions);
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const groupByParam = searchParams.get("groupBy");
  const groupBy = groupByParam === "month" ? "month" : groupByParam === "year" ? "year" : "day";

  // Default range: last 30 days (day view), last 12 months (month view), or last 5 years (year view) when nothing is specified.
  const now = new Date();
  let rangeFrom: Date;
  const rangeTo: Date = to ? new Date(to + "T23:59:59") : now;
  if (from) {
    rangeFrom = new Date(from);
  } else if (groupBy === "year") {
    rangeFrom = new Date(now.getFullYear() - 4, 0, 1);
  } else if (groupBy === "month") {
    rangeFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  } else {
    rangeFrom = new Date(now);
    rangeFrom.setDate(rangeFrom.getDate() - 29);
    rangeFrom.setHours(0, 0, 0, 0);
  }

  const dateFilter = { gte: rangeFrom, lte: rangeTo };

  const sales = await db.sale.findMany({
    where: { cancelled: false, saleDate: dateFilter },
    include: { items: { include: { medicine: true } } },
  });

  const purchases = await db.purchase.findMany({
    where: { purchaseDate: dateFilter },
    include: { supplier: true },
  });

  const purchaseReturns = await db.purchaseReturn.findMany({
    where: { returnDate: dateFilter },
  });

  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const totalDiscount = sales.reduce((s, x) => s + x.discount, 0);
  const totalTax = sales.reduce((s, x) => s + x.tax, 0);
  const totalProfit = sales.reduce(
    (s, x) => s + x.items.reduce((p, i) => p + (i.sellingRate - i.purchaseRate) * i.quantity, 0),
    0
  );
  const totalPurchaseAmount = purchases.reduce((s, x) => s + x.totalAmount, 0);
  const totalPurchasePaid = purchases.reduce((s, x) => s + x.paidAmount, 0);
  const totalPurchaseReturned = purchaseReturns.reduce((s, x) => s + x.totalAmount, 0);

  // Sales grouped by day/month
  const salesByPeriod = new Map<string, { period: string; bills: number; revenue: number; profit: number }>();
  for (const sale of sales) {
    const key = periodKey(sale.saleDate, groupBy);
    const row = salesByPeriod.get(key) ?? { period: key, bills: 0, revenue: 0, profit: 0 };
    row.bills += 1;
    row.revenue += sale.total;
    row.profit += sale.items.reduce((p, i) => p + (i.sellingRate - i.purchaseRate) * i.quantity, 0);
    salesByPeriod.set(key, row);
  }

  // Purchases grouped by day/month
  const purchasesByPeriod = new Map<string, { period: string; count: number; amount: number; paid: number; due: number }>();
  for (const p of purchases) {
    const key = periodKey(p.purchaseDate, groupBy);
    const row = purchasesByPeriod.get(key) ?? { period: key, count: 0, amount: 0, paid: 0, due: 0 };
    row.count += 1;
    row.amount += p.totalAmount;
    row.paid += p.paidAmount;
    row.due += p.totalAmount - p.paidAmount;
    purchasesByPeriod.set(key, row);
  }

  const byMedicine = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.medicine.name;
      const row = byMedicine.get(key) ?? { name: key, quantity: 0, revenue: 0 };
      row.quantity += item.quantity;
      row.revenue += item.amount;
      byMedicine.set(key, row);
    }
  }
  const topMedicines = [...byMedicine.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const batches = await db.medicineBatch.findMany({ include: { medicine: true } });
  const lowStock = batches.filter((b) => b.quantity <= b.medicine.minStock);
  const expired = batches.filter((b) => b.expiryDate < now && b.quantity > 0);
  const expiringSoon = batches.filter(
    (b) => b.expiryDate >= now && b.expiryDate.getTime() - now.getTime() <= 90 * 86400000 && b.quantity > 0
  );

  const supplierDues = await db.supplier.findMany({
    where: { dueAmount: { not: 0 } },
    select: { id: true, name: true, dueAmount: true },
    orderBy: { dueAmount: "desc" },
  });
  const customerDues = await db.customer.findMany({
    where: { dueAmount: { not: 0 } },
    select: { id: true, name: true, dueAmount: true },
    orderBy: { dueAmount: "desc" },
  });

  return NextResponse.json({
    groupBy,
    from: rangeFrom,
    to: rangeTo,
    summary: {
      billCount: sales.length,
      totalRevenue,
      totalDiscount,
      totalTax,
      // Profit is only included for users granted the Profit permission (admins always).
      ...(showProfit ? { totalProfit } : {}),
      purchaseCount: purchases.length,
      totalPurchaseAmount,
      totalPurchasePaid,
      totalPurchaseDue: totalPurchaseAmount - totalPurchasePaid,
      totalPurchaseReturned,
      totalSupplierDue: supplierDues.reduce((s, x) => s + x.dueAmount, 0),
      totalCustomerDue: customerDues.reduce((s, x) => s + x.dueAmount, 0),
    },
    salesByPeriod: [...salesByPeriod.values()]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(({ profit, ...row }) => (showProfit ? { ...row, profit } : row)),
    purchasesByPeriod: [...purchasesByPeriod.values()].sort((a, b) => a.period.localeCompare(b.period)),
    topMedicines,
    lowStock: lowStock.map((b) => ({ medicine: b.medicine.name, batch: b.batchNumber, quantity: b.quantity, minStock: b.medicine.minStock })),
    expired: expired.map((b) => ({ medicine: b.medicine.name, batch: b.batchNumber, quantity: b.quantity, expiryDate: b.expiryDate })),
    expiringSoon: expiringSoon.map((b) => ({ medicine: b.medicine.name, batch: b.batchNumber, quantity: b.quantity, expiryDate: b.expiryDate })),
    supplierDues,
    customerDues,
  });
  } catch (e) {
    return apiError(e);
  }
}
