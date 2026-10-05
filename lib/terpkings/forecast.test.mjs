// Predictor unit tests — run with `npm test` (Node's built-in runner; Node 24
// strips the types from forecast.ts on import, so no test dependency is needed).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAND_BROKEN,
  BAND_SEEN,
  BAND_STRAINED,
  bandFor,
  predict,
} from "./forecast.ts";

/** Small seeded PRNG (mulberry32) so the "random player" is repeatable. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Play `inputs` against the predictor; return its hit rate after `warmup` inputs. */
function hitRate(inputs, warmup, rand) {
  let hits = 0;
  for (let i = 0; i < inputs.length; i++) {
    const forecast = predict(inputs.slice(0, i), rand);
    if (i >= warmup && forecast === inputs[i]) hits++;
  }
  return hits / (inputs.length - warmup);
}

test("alternating L/R is predicted at >= 90% after warm-up", () => {
  const inputs = Array.from({ length: 40 }, (_, i) => (i % 2 ? "R" : "L"));
  const rate = hitRate(inputs, 6, seeded(1));
  assert.ok(rate >= 0.9, `hit rate ${rate}`);
});

test("a constant input is predicted at >= 90% after warm-up", () => {
  const inputs = Array.from({ length: 40 }, () => "L");
  const rate = hitRate(inputs, 6, seeded(2));
  assert.ok(rate >= 0.9, `hit rate ${rate}`);
});

test("a seeded random input stays near 50%", () => {
  for (const seed of [7, 1937, 420]) {
    const player = seeded(seed);
    const inputs = Array.from({ length: 4000 }, () => (player() < 0.5 ? "L" : "R"));
    const rate = hitRate(inputs, 6, seeded(seed + 1));
    assert.ok(rate > 0.46 && rate < 0.54, `seed ${seed}: hit rate ${rate}`);
  }
});

test("empty history falls through to the coin flip", () => {
  assert.equal(predict([], () => 0.1), "L");
  assert.equal(predict([], () => 0.9), "R");
});

test("result bands: <=50 broken, 51-60 strained, >60 seen", () => {
  assert.equal(bandFor(0), BAND_BROKEN);
  assert.equal(bandFor(50), BAND_BROKEN);
  assert.equal(bandFor(52.5), BAND_STRAINED);
  assert.equal(bandFor(60), BAND_STRAINED);
  assert.equal(bandFor(62.5), BAND_SEEN);
  assert.equal(bandFor(100), BAND_SEEN);
});
