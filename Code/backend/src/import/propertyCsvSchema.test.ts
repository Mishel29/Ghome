import { describe, expect, it } from "vitest";
import { PROPERTY_CSV_COLUMNS, validatePropertyCsvHeaders } from "./propertyCsvSchema.js";

describe("property CSV headers", () => {
it("accepts the Sample.csv header schema", () => {
  const result = validatePropertyCsvHeaders([...PROPERTY_CSV_COLUMNS]);
  expect(result.valid).toBe(true);
  expect(result.missingColumns).toEqual([]);
});

it("reports missing, unknown, duplicate, and empty headers", () => {
  const result = validatePropertyCsvHeaders(["Name", "Name", "Unknown", ""]);
  expect(result.valid).toBe(false);
  expect(result.missingColumns).toContain("Address");
  expect(result.duplicateColumns).toEqual(["Name"]);
  expect(result.unknownColumns).toEqual(["Unknown"]);
  expect(result.emptyColumns).toEqual([4]);
});

it("allows an empty spacer column before optional media URLs", () => {
  const headers = [...PROPERTY_CSV_COLUMNS.slice(0, -2), , "Image URL", "Video URL"];
  const result = validatePropertyCsvHeaders(headers);
  expect(result.valid).toBe(true);
  expect(result.emptyColumns).toEqual([19]);
  expect(result.receivedColumns).toContain("Image URL");
});
});
