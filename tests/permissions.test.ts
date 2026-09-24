import assert from "node:assert/strict";
import * as P from "../lib/permissions";

// Admin gets everything incl. profit
const adm = P.resolvePermissions("ADMIN", null);
assert.ok(P.can(adm, "profit", "view") && P.can(adm, "medicines", "delete") && P.can(adm, "reports"));

// Legacy user (null) → least-privilege default, no profit / reports / purchases
const legacy = P.resolvePermissions("CASHIER", null);
assert.ok(P.can(legacy, "billing", "add"));
assert.ok(!P.can(legacy, "profit", "view") && !P.can(legacy, "reports", "view") && !P.can(legacy, "purchases", "view"));
assert.ok(!P.canSeeCostPrices(legacy));

// Sanitize: junk dropped, add implies view, unsupported action dropped
const s = P.sanitizePermissions({
  medicines: ["add", "edit", "bogus"],     // edit unsupported for medicines
  hacker: ["view"],                        // unknown module
  reports: "view",                         // not an array
  profit: ["view", "delete"],
  suppliers: [],
});
assert.deepEqual(s.medicines, ["view", "add"]);
assert.deepEqual(s.profit, ["view"]);
assert.equal((s as any).hacker, undefined);
assert.equal(s.reports, undefined);
assert.equal(s.suppliers, undefined);
assert.deepEqual(P.sanitizePermissions(null), {});
assert.deepEqual(P.sanitizePermissions([1, 2]), {});
assert.deepEqual(P.sanitizePermissions("x"), {});

// Explicit empty object = no access at all (NOT the default)
const none = P.resolvePermissions("CASHIER", {});
assert.equal(P.firstAllowedPath(none), null);

// Profit is never granted implicitly
const noProfit = P.allExceptProfit();
assert.ok(!P.can(noProfit, "profit") && P.can(noProfit, "reports"));
assert.ok(P.canSeeCostPrices(P.sanitizePermissions({ purchases: ["view"] })));
assert.ok(P.canSeeCostPrices(P.sanitizePermissions({ profit: ["view"] })));
assert.ok(!P.canSeeCostPrices(P.sanitizePermissions({ medicines: ["view", "add"], billing: ["view"] })));

// firstAllowedPath
assert.equal(P.firstAllowedPath(P.sanitizePermissions({ reports: ["view"], stock: ["view"] })), "/stock");

// Redaction keeps Dates and strips nested purchaseRate
const d = new Date();
const red: any = P.omitCostFields({ a: 1, when: d, items: [{ purchaseRate: 5, sellingRate: 9, batch: { purchaseRate: 5, qty: 2 } }] });
assert.ok(red.when instanceof Date && red.when === d);
assert.equal(red.items[0].purchaseRate, undefined);
assert.equal(red.items[0].batch.purchaseRate, undefined);
assert.equal(red.items[0].sellingRate, 9);
assert.equal(P.omitCostFields(null), null);
console.log("permissions.ts: all assertions passed");
