// Shipping rule tests (D-120) — run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fallbackQuote, priceAfterThreshold, FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FALLBACK_CENTS } from "../commerce/config.ts";
import { formatShipsAfter, preorderLine } from "../commerce/preorder.ts";

test("Standard is free at the $75 threshold; Priority never is", () => {
  assert.equal(priceAfterThreshold("standard", 812, FREE_SHIPPING_THRESHOLD_CENTS), 0);
  assert.equal(priceAfterThreshold("standard", 812, FREE_SHIPPING_THRESHOLD_CENTS - 1), 812);
  assert.equal(priceAfterThreshold("priority", 1140, 100_000), 1140);
});

test("fallback quote is one flat Standard option, flagged", () => {
  const q = fallbackQuote("60653", 1000);
  assert.equal(q.fallback, true);
  assert.equal(q.options.length, 1);
  assert.equal(q.options[0].service, "standard");
  assert.equal(q.options[0].cents, SHIPPING_FALLBACK_CENTS);
  assert.equal(fallbackQuote("60653", 9000).options[0].cents, 0);
});

test("pre-order date formats in UTC and reads as one line", () => {
  assert.equal(formatShipsAfter("2027-01-31"), "January 31, 2027");
  assert.equal(preorderLine("2027-01-31"), "Pre-order · ships by January 31, 2027");
  assert.equal(preorderLine(null), null);
  assert.equal(formatShipsAfter("not a date"), null);
});
