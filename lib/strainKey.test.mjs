// strainKey unit tests — run with `npm test` (Node's built-in runner).
// Pairs are real names from catalog_products and product_availability (2026-10-21).
import assert from "node:assert/strict";
import { test } from "node:test";
import { strainDisplayName, strainKey } from "./strainKey.ts";

const SAME = [
  ["Higher Self | AppleScotti | Small Batch Flower | Hybrid |", "Higher Self Apple Scotti 14g Prepack", "applescotti"],
  ["Higher Self | AppleScotti | Pre Roll | [.35g] | 10pk | 3.5g | Hybrid", "Apple Scotti [3.5g]", "applescotti"],
  ["TerpKings | Razz Gas | Liquid Diamonds | All-In-One", "Razz Gas [GAS]", "razzgas"],
  ["TerpKings | Razz Gas | Liquid Diamonds | All-In-One", "TerpKings Razz Gas .5g Live Resin All-In-One", "razzgas"],
  ["TerpKings | Magic Melonade | Liquid Diamonds | All-In-One", "Magic Melonade | FRUIT | Liquid Diamonds", "magicmelonade"],
  ["TerpKings | Fruit Loopz | Liquid Diamonds | All-In-One", "Fruit Loopz [DESSERT] Astro Vape", "fruitloopz"],
  ["Higher Self | Vape Stone | Forbidden Fruit | 1g", "Forbidden Fruit Vape Stone Disposable", "forbiddenfruit"],
  ["Higher Self | Vape Stone | Acai Berry Gelato | 1g", "Açaí Berry Gelato", "acaiberrygelato"],
  ["Outfitters | Cherry Runtz | Top Shelf |", "Outfitters | Infused Blunt | Cherry Runtz | Glass Tip | 2g", "cherryruntz"],
  ["Higher Self | Super Lemon Haze | Flower |", "Super Lemon Haze", "superlemonhaze"],
];

for (const [catalog, menu, expected] of SAME) {
  test(`${catalog}  ≡  ${menu}`, () => {
    assert.equal(strainKey(catalog), expected);
    assert.equal(strainKey(menu), expected);
  });
}

test("different strains stay different", () => {
  assert.notEqual(strainKey("Cherry Diesel"), strainKey("Cherry Runtz"));
  assert.notEqual(strainKey("Pink Lemonade"), strainKey("Pineapple Punch"));
});

test("formats of the same strain share a key (strain-level matching, PRD decision 2)", () => {
  assert.equal(strainKey("Tangie Lime"), strainKey("Tangie Lime Vape Stone"));
});

test("null and empty are empty", () => {
  assert.equal(strainKey(null), "");
  assert.equal(strainKey(""), "");
});

test("display name is the second pipe field", () => {
  assert.equal(strainDisplayName("Higher Self | AppleScotti | Small Batch Flower | Hybrid |"), "AppleScotti");
  assert.equal(strainDisplayName("Black Velvet"), "Black Velvet");
});

test("display name drops tags and format words but keeps case", () => {
  assert.equal(strainDisplayName("TerpKings | Razz Gas [Gas] Liquid Diamonds All-In-One | Disposable"), "Razz Gas");
  assert.equal(strainDisplayName("Higher Self | Vape Stone - Maui Wowie | Disposable"), "Maui Wowie");
  assert.equal(strainDisplayName("Savage Squad Strains | Black Velvet #33 | Flower | Indica"), "Black Velvet #33");
});
