// slugify — run with `npm test` (Node's built-in runner).
import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify } from "./slug.ts";

test("slugify: lower-case ASCII, accents stripped, & → and, punctuation → dashes", () => {
  assert.equal(slugify("Gelato #41 (Indica)"), "gelato-41-indica");
  assert.equal(slugify("Crème Brûlée"), "creme-brulee");
  assert.equal(slugify("Peanut Butter & Jelly"), "peanut-butter-and-jelly");
  assert.equal(slugify("  --Leading / trailing--  "), "leading-trailing");
  assert.equal(slugify("TerpKings Live Resin 1g"), "terpkings-live-resin-1g");
});

test("slugify: empty input and the 120-char cap", () => {
  assert.equal(slugify(""), "");
  assert.equal(slugify("!!!"), "");
  assert.equal(slugify("a".repeat(200)).length, 120);
});
