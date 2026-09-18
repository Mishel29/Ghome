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
