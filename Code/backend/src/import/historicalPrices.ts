export type HistoricalPrice = {
  year: number;
  value: number;
};

export type HistoricalValidationIssue = {
  field: "Years" | "Historical Prices" | "Completion Year" | "Price";
  message: string;
  index?: number;
};

export type HistoricalValidationResult = {
  values: HistoricalPrice[];
  issues: HistoricalValidationIssue[];
};

const MIN_YEAR = 1800;
const MAX_YEAR = 2200;
const CURRENT_PRICE_TOLERANCE = 0.05;

function parseArray(value: unknown, field: HistoricalValidationIssue["field"], issues: HistoricalValidationIssue[]) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return [] as unknown[];
  }

  let parsed: unknown;
  try {
    parsed = Array.isArray(value) ? value : JSON.parse(String(value));
  } catch {
    issues.push({ field, message: `${field} must be a valid JSON array.` });
    return [] as unknown[];
  }

  if (!Array.isArray(parsed)) {
    issues.push({ field, message: `${field} must be a JSON array.` });
    return [] as unknown[];
  }

  return parsed;
}

export function validateHistoricalPrices(
  yearsValue: unknown,
  pricesValue: unknown,
  completionYear: number | null | undefined,
  currentPrice: number | null | undefined,
): HistoricalValidationResult {
  const issues: HistoricalValidationIssue[] = [];
  const years = parseArray(yearsValue, "Years", issues);
  const prices = parseArray(pricesValue, "Historical Prices", issues);

  if (years.length !== prices.length) {
    issues.push({ field: "Historical Prices", message: "Years and Historical Prices must contain the same number of values." });
  }

  if ((years.length === 0) !== (prices.length === 0)) {
    issues.push({ field: "Years", message: "Years and Historical Prices must both be provided or both be empty." });
  }

  const values: HistoricalPrice[] = [];
  const count = Math.min(years.length, prices.length);
  for (let index = 0; index < count; index += 1) {
    const year = Number(years[index]);
    const value = Number(prices[index]);

    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      issues.push({ field: "Years", message: `Year at index ${index} must be an integer between ${MIN_YEAR} and ${MAX_YEAR}.`, index });
      continue;
    }
    if (!Number.isFinite(value) || value <= 0) {
      issues.push({ field: "Historical Prices", message: `Historical price at index ${index} must be a positive number.`, index });
      continue;
    }
    values.push({ year, value });
  }

  for (let index = 1; index < values.length; index += 1) {
    if (values[index].year <= values[index - 1].year) {
      issues.push({ field: "Years", message: "Years must be strictly ascending with no duplicates.", index });
    }
  }

  if (values.length > 0 && completionYear != null && values[0].year !== Math.round(completionYear)) {
    issues.push({ field: "Completion Year", message: "The first historical year must match Completion Year." });
  }

  if (values.length > 0 && currentPrice != null && Number.isFinite(currentPrice)) {
    const latest = values[values.length - 1];
    const difference = Math.abs(latest.value - currentPrice);
    if (difference > CURRENT_PRICE_TOLERANCE + 1e-9) {
      issues.push({ field: "Price", message: `The latest historical price differs from Price by ${difference.toFixed(2)}, exceeding the ${CURRENT_PRICE_TOLERANCE.toFixed(2)} rounding tolerance.` });
    } else {
      latest.value = currentPrice;
    }
  }

  return { values, issues };
}

export function historicalValidationMessage(result: HistoricalValidationResult) {
  return result.issues.map((issue) => `${issue.field}: ${issue.message}`).join(" ");
}
