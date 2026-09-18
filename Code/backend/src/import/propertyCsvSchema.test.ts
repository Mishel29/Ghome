import assert from "node:assert/strict";
import test from "node:test";
import { PROPERTY_CSV_COLUMNS, validatePropertyCsvHeaders } from "./propertyCsvSchema.js";

test("accepts the Sample.csv header schema", () => {
  const result = validatePropertyCsvHeaders([...PROPERTY_CSV_COLUMNS]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.missingColumns, []);
});

test("reports missing, unknown, duplicate, and empty headers", () => {
  const result = validatePropertyCsvHeaders(["Name", "Name", "Unknown", ""]);
  assert.equal(result.valid, false);
  assert.ok(result.missingColumns.includes("Address"));
  assert.deepEqual(result.duplicateColumns, ["Name"]);
  assert.deepEqual(result.unknownColumns, ["Unknown"]);
  assert.deepEqual(result.emptyColumns, [4]);
});

test("allows an empty spacer column before optional media URLs", () => {
  const headers = [...PROPERTY_CSV_COLUMNS.slice(0, -2), , "Image URL", "Video URL"];
  const result = validatePropertyCsvHeaders(headers);
  assert.equal(result.valid, true);
  assert.deepEqual(result.emptyColumns, [19]);
  assert.equal(result.receivedColumns.includes("Image URL"), true);
});
