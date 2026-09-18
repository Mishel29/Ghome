import assert from "node:assert/strict";
import test from "node:test";
import { validateHistoricalPrices } from "./historicalPrices.js";

test("parses paired historical years and prices", () => {
  const result = validateHistoricalPrices("[2021, 2022, 2023]", "[400000, 425000, 430000]", 2021, 430000);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.values, [
    { year: 2021, value: 400000 },
    { year: 2022, value: 425000 },
    { year: 2023, value: 430000 },
  ]);
});

test("rejects unequal, unordered, and completion-mismatched history", () => {
  const result = validateHistoricalPrices("[2022, 2021]", "[100, 200, 300]", 2020, 300);
  assert.ok(result.issues.some((issue) => issue.message.includes("same number")));
  assert.ok(result.issues.some((issue) => issue.message.includes("strictly ascending")));
  assert.ok(result.issues.some((issue) => issue.field === "Completion Year"));
});

test("normalizes a small latest-price rounding difference", () => {
  const result = validateHistoricalPrices("[2011, 2026]", "[7980, 5419]", 2011, 5419.05);
  assert.deepEqual(result.issues, []);
  assert.equal(result.values.at(-1)?.value, 5419.05);
});

test("rejects a material latest-price difference", () => {
  const result = validateHistoricalPrices("[2011, 2026]", "[7980, 4900]", 2011, 5419.05);
  assert.ok(result.issues.some((issue) => issue.field === "Price"));
});

test("allows an empty history", () => {
  const result = validateHistoricalPrices("", "", 2021, 100);
  assert.deepEqual(result, { values: [], issues: [] });
});
