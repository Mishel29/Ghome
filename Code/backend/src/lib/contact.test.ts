import { describe, expect, it } from "vitest";
import { normalizePersonName, normalizePhone, subscriberNameKey } from "./contact.js";

describe("subscriber contact validation", () => {
  it("normalizes names before uniqueness comparisons", () => {
    expect(normalizePersonName("  Ada   Lovelace ")).toBe("Ada Lovelace");
    expect(subscriberNameKey("ADA  LOVELACE")).toBe("ada lovelace");
  });

  it("normalizes formatted international country-code phone numbers", () => {
    expect(normalizePhone("+353871234567", true)).toBe("+353871234567");
    expect(normalizePhone("+353 1 234 5678", true)).toBe("+35312345678");
  });

  it("allows an omitted optional phone but requires it when requested", () => {
    expect(normalizePhone(undefined)).toBeNull();
    expect(() => normalizePhone(undefined, true)).toThrow("required");
  });

  it("rejects local-only, repeated-country-code, and non-numeric phone input", () => {
    for (const phone of ["0871234567", "+353+871234567", "+353abc871234567"]) {
      expect(() => normalizePhone(phone, true)).toThrow();
    }
  });
});
