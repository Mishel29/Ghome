import { describe, expect, it } from "vitest";
import { validateHistoricalPrices } from "./historicalPrices.js";

describe("historical price validation", () => {
it("parses paired historical years and prices", () => {
  const result = validateHistoricalPrices("[2021, 2022, 2023]", "[400000, 425000, 430000]", 2021, 430000);
  expect(result.issues).toEqual([]);
  expect(result.values).toEqual([
    { year: 2021, value: 400000 },
    { year: 2022, value: 425000 },
    { year: 2023, value: 430000 },
  ]);
});

it("rejects unequal, unordered, and completion-mismatched history", () => {
  const result = validateHistoricalPrices("[2022, 2021]", "[100, 200, 300]", 2020, 300);
  expect(result.issues.some((issue) => issue.message.includes("same number"))).toBe(true);
  expect(result.issues.some((issue) => issue.message.includes("strictly ascending"))).toBe(true);
  expect(result.issues.some((issue) => issue.field === "Completion Year")).toBe(true);
});

it("normalizes a small latest-price rounding difference", () => {
  const result = validateHistoricalPrices("[2011, 2026]", "[7980, 5419]", 2011, 5419.05);
  expect(result.issues).toEqual([]);
  expect(result.values.at(-1)?.value).toBe(5419.05);
});

it("rejects a material latest-price difference", () => {
  const result = validateHistoricalPrices("[2011, 2026]", "[7980, 4900]", 2011, 5419.05);
  expect(result.issues.some((issue) => issue.field === "Price")).toBe(true);
});

it("allows an empty history", () => {
  const result = validateHistoricalPrices("", "", 2021, 100);
  expect(result).toEqual({ values: [], issues: [] });
});
});
