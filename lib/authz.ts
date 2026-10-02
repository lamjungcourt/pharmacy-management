import { SessionUser } from "./auth";

export function isAdminSession(session: SessionUser | null): boolean {
  return !!session && session.role === "ADMIN";
}

/**
 * Profit/cost redaction — used everywhere the API is reachable by a Cashier session.
 *
 * IMPORTANT: this is the *server-side* enforcement point required by the spec ("profit
 * information must be admin only ... the server/API/database access layer must enforce
 * authorization"). It must be applied to every response that could contain purchaseRate,
 * cost, profit, or stock valuation figures, regardless of what the UI chooses to render,
 * because a Cashier could otherwise read these straight from the network response.
 */
export function redactBatchForRole<T extends Record<string, any>>(batch: T, admin: boolean): T {
  if (admin) return batch;
  const { purchaseRate, ...rest } = batch;
  return rest as T;
}

export function redactBatchesForRole<T extends Record<string, any>>(batches: T[], admin: boolean): T[] {
  return batches.map((b) => redactBatchForRole(b, admin));
}

export function redactMedicineForRole<T extends { batches?: any[] }>(medicine: T, admin: boolean): T {
  if (admin) return medicine;
  return {
    ...medicine,
    batches: medicine.batches ? redactBatchesForRole(medicine.batches, admin) : medicine.batches,
  };
}

export function redactSaleItemForRole<T extends Record<string, any>>(item: T, admin: boolean): T {
  if (admin) return item;
  const { purchaseRate, batch, ...rest } = item as any;
  // A nested batch (e.g. from `include: { batch: true }`) also carries the batch's
  // *current* purchaseRate — strip that too, not just the sale item's own snapshot.
  const safeBatch = batch && typeof batch === "object" ? redactBatchForRole(batch, admin) : batch;
  return (batch !== undefined ? { ...rest, batch: safeBatch } : rest) as T;
}

export function redactSaleForRole<T extends { items?: any[] }>(sale: T, admin: boolean): T {
  if (admin) return sale;
  return {
    ...sale,
    items: sale.items ? sale.items.map((i) => redactSaleItemForRole(i, admin)) : sale.items,
  };
}

/** Strip purchase-cost / profit fields from a purchase item (used only if a purchase
 * response is ever exposed outside the admin-only purchase module). */
export function redactPurchaseItemForRole<T extends Record<string, any>>(item: T, admin: boolean): T {
  if (admin) return item;
  const { purchaseRate, discount, vat, amount, ...rest } = item;
  return rest as T;
}
