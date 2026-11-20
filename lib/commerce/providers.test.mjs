import test from "node:test";
import assert from "node:assert/strict";
import { isPod, isProviderKey, madeToOrderLine, PROVIDER_KEYS } from "./providers.ts";

test("PROVIDER_KEYS: self plus the four POD vendors", () => {
  assert.deepEqual([...PROVIDER_KEYS], ["self", "printify", "tapstitch", "nycfactory", "podpartner"]);
  assert.ok(isProviderKey("nycfactory") && isProviderKey("self"));
  assert.ok(!isProviderKey("shopify") && !isProviderKey(null) && !isProviderKey(""));
});

test("isPod: everything except self (null/unknown = in-house)", () => {
  assert.equal(isPod("self"), false);
  assert.equal(isPod(null), false);
  assert.equal(isPod(undefined), false);
  assert.equal(isPod(""), false);
  for (const k of ["printify", "tapstitch", "nycfactory", "podpartner"]) assert.equal(isPod(k), true);
});

test("madeToOrderLine: range, single value, or bare line", () => {
  assert.equal(madeToOrderLine({ production_days_min: 3, production_days_max: 7 }), "Made to order · ships in 3–7 business days");
  assert.equal(madeToOrderLine({ production_days_min: 5, production_days_max: 5 }), "Made to order · ships in 5 business days");
  assert.equal(madeToOrderLine({ production_days_min: 3, production_days_max: null }), "Made to order");
  assert.equal(madeToOrderLine({ production_days_min: null, production_days_max: 7 }), "Made to order");
  assert.equal(madeToOrderLine(null), "Made to order");
  assert.equal(madeToOrderLine(undefined), "Made to order");
  // Defensive: a swapped pair still reads low–high.
  assert.equal(madeToOrderLine({ production_days_min: 7, production_days_max: 3 }), "Made to order · ships in 3–7 business days");
});
