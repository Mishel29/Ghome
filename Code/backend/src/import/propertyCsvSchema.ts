export const PROPERTY_CSV_COLUMNS = [
  "Name",
  "Address",
  "Postal Code",
  "County",
  "Price",
  "Sold times",
  "Property Type",
  "Status",
  "Stage",
  "Agent",
  "Description",
  "Property Size Category",
  "Property Size",
  "Beds",
  "Baths",
  "Completion Year",
  "Years",
  "Historical Prices",
  "Image URL",
  "Video URL",
] as const;

export type PropertyCsvSchemaResult = {
  valid: boolean;
  expectedColumns: string[];
  requiredColumns: string[];
  receivedColumns: string[];
  missingColumns: string[];
  unknownColumns: string[];
  duplicateColumns: string[];
  emptyColumns: number[];
};

export function validatePropertyCsvHeaders(headers: unknown[]): PropertyCsvSchemaResult {
  const rawHeaders = Array.from(headers, (header) => String(header ?? ""));
  const receivedColumns = rawHeaders.filter((header) => header.trim());
  const expectedColumns = [...PROPERTY_CSV_COLUMNS];
  const requiredColumns = expectedColumns.slice(0, 16);
  const missingColumns = requiredColumns.filter((column) => !receivedColumns.includes(column));
  const unknownColumns = receivedColumns.filter((column) => column.trim() && !expectedColumns.includes(column as typeof PROPERTY_CSV_COLUMNS[number]));
  const duplicateColumns = [...new Set(receivedColumns.filter((column, index) => column !== "" && receivedColumns.indexOf(column) !== index))];
  const emptyColumns = rawHeaders.flatMap((column, index) => column.trim() ? [] : [index + 1]);

  return {
    valid: missingColumns.length === 0 && unknownColumns.length === 0 && duplicateColumns.length === 0,
    expectedColumns,
    requiredColumns,
    receivedColumns,
    missingColumns,
    unknownColumns,
    duplicateColumns,
    emptyColumns,
  };
}
