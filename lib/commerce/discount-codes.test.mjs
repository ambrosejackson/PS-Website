import test from "node:test";
import assert from "node:assert/strict";
import { discountStatus, generateCode, isDiscountStatus } from "./discount-codes.ts";

test("generateCode: PS{pct}-XXXXXX from the ambiguity-free alphabet", () => {
  for (const pct of [15, 1, 100]) {
    const code = generateCode(pct);
    assert.match(code, new RegExp(`^PS${pct}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$`));
  }
  assert.match(generateCode(), /^PS15-/);
  const seen = new Set(Array.from({ length: 200 }, () => generateCode(20)));
  assert.ok(seen.size > 190, "codes are effectively unique");
});

test("discountStatus: redeemed wins, then expiry, else open", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  assert.equal(discountStatus({ redeemed_at: null, expires_at: null }, now), "open");
  assert.equal(discountStatus({ redeemed_at: null, expires_at: "2026-12-01T00:00:00Z" }, now), "open");
  assert.equal(discountStatus({ redeemed_at: null, expires_at: "2026-11-02T12:00:00Z" }, now), "expired");
  assert.equal(discountStatus({ redeemed_at: null, expires_at: "2026-10-01T00:00:00Z" }, now), "expired");
  assert.equal(discountStatus({ redeemed_at: "2026-10-15T00:00:00Z", expires_at: "2026-10-01T00:00:00Z" }, now), "redeemed");
});

test("isDiscountStatus", () => {
  assert.ok(isDiscountStatus("open") && isDiscountStatus("redeemed") && isDiscountStatus("expired"));
  assert.ok(!isDiscountStatus("") && !isDiscountStatus("used") && !isDiscountStatus(null));
});
