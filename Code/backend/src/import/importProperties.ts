import "dotenv/config";
import XLSX from "xlsx";
import { prisma } from "../lib/prisma.js";
import fs from "node:fs";
import { historicalValidationMessage, validateHistoricalPrices } from "./historicalPrices.js";
import { validatePropertyCsvHeaders } from "./propertyCsvSchema.js";

const FILE_PATH =
  process.env.PROPERTY_IMPORT_PATH ?? "../../Notes/Dataset/Sample.csv";

const BATCH_SIZE = 500;
const IMPORT_LIMIT = 1000;

type DatasetRow = {
  Name?: string;
  Address?: string;
  "Postal Code"?: string;
  County?: string;
  Price?: number | string;
  "Sold times"?: string;
  "Property Type"?: string;
  Status?: string;
  Stage?: string;
  Agent?: string;
  Description?: string;
  "Property Size Category"?: string;
  "Property Size"?: number | string;
  Beds?: number | string;
  Baths?: number | string;
  "Completion Year"?: number | string;
  Years?: string;
  "Historical Prices"?: string;
};

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function normalizeStatus(value: string) {
  const status = value.toLowerCase().trim();

  switch (status) {
    case "draft":
      return "DRAFT";

    case "coming soon":
      return "COMING_SOON";

    case "on sale":
      return "ON_SALE";

    case "sold out":
      return "SOLD_OUT";

    case "offline":
      return "OFFLINE";

    default:
      return null;
  }
}

function normalizeStage(value: string) {
  const stage = value.toLowerCase().trim();

  switch (stage) {
    case "planning":
      return "PLANNING";

    case "under construction":
      return "UNDER_CONSTRUCTION";

    case "ready to move":
    case "ready to move-in":
      return "READY_TO_MOVE";

    default:
      return null;
  }
}

function calculateGrowth(
  current: number,
  previous: number | undefined
): number | null {
  if (previous === undefined || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

async function main() {
  console.log("Reading dataset...");

  const workbook = XLSX.readFile(FILE_PATH);

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("No worksheet found in Excel file.");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
  });
  const headerResult = validatePropertyCsvHeaders(headerRows[0] ?? []);
  if (!headerResult.valid) {
    throw new Error(`Invalid property CSV headers: ${JSON.stringify(headerResult)}`);
  }

  const allRows = XLSX.utils.sheet_to_json<DatasetRow>(worksheet, {
  defval: null,
  });

  const rows = allRows.slice(0, IMPORT_LIMIT);

  console.log(`Found ${rows.length.toLocaleString()} rows.`);

  if (rows.length === 0) {
    throw new Error("Dataset is empty.");
  }

  /*
   * ---------------------------------------------------------
   * 1. Collect unique agents
   * ---------------------------------------------------------
   */

  const agentNames = new Set<string>();

  for (const row of rows) {
    const agent = cleanString(row.Agent);

    if (agent) {
      agentNames.add(agent);
    }
  }

  console.log(`Found ${agentNames.size} unique agents.`);

  /*
   * ---------------------------------------------------------
   * 2. Create/find agents
   * ---------------------------------------------------------
   */

  const agentMap = new Map<string, string>();

  for (const agentName of agentNames) {
    const emailName = agentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");

    const email = `${emailName}@harborstone.ie`;

    const agent = await prisma.user.upsert({
      where: {
        email,
      },
      update: {
        name: agentName,
        role: "AGENT",
      },
      create: {
        name: agentName,
        email,
        role: "AGENT",
      },
    });

    agentMap.set(agentName, agent.id);
  }

  console.log("Agents ready.");

  /*
   * ---------------------------------------------------------
   * 3. Import properties
   * ---------------------------------------------------------
   */

  let imported = 0;
  let skipped = 0;
  let historyImported = 0;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);

    for (const [batchIndex, row] of batch.entries()) {
      const rowNumber = start + batchIndex + 2;

      const name = cleanString(row.Name);
      const address = cleanString(row.Address);
      const postalCode = cleanString(row["Postal Code"]);
      const county = cleanString(row.County);
      const propertyType = cleanString(row["Property Type"]);
      const status = normalizeStatus(cleanString(row.Status));
      const stage = normalizeStage(cleanString(row.Stage));
      const agentName = cleanString(row.Agent);

      const price = parseNumber(row.Price);
      const propertySize = parseNumber(row["Property Size"]);
      const beds = parseNumber(row.Beds);
      const baths = parseNumber(row.Baths);
      const completionYear = parseNumber(row["Completion Year"]);

      /*
       * Validate required dataset fields.
       */

      if (
        !name ||
        !address ||
        !county ||
        !propertyType ||
        !status ||
        !stage ||
        price === null ||
        propertySize === null ||
        beds === null ||
        baths === null
      ) {
        skipped++;

        console.warn(
          `Skipping row ${rowNumber}: missing/invalid required property data`
        );

        continue;
      }

      /*
       * sourceKey gives every source record a stable unique identifier.
       *
       * We deliberately include the source row number because the source
       * dataset can contain repeated addresses.
       */

      const sourceKey = `dataset-row-${rowNumber}`;

      const agentId = agentName
        ? agentMap.get(agentName) ?? null
        : null;

      /*
       * The current dataset provides one price, one bedroom count,
       * one bathroom count and one property-size value.
       *
       * Therefore min/max are initially identical.
       */

      const historicalResult = validateHistoricalPrices(
        row.Years,
        row["Historical Prices"],
        completionYear !== null ? Math.round(completionYear) : null,
        price,
      );

      if (historicalResult.issues.length > 0) {
        skipped++;
        console.warn(
          `Skipping row ${rowNumber}: ${historicalValidationMessage(historicalResult)}`,
        );
        continue;
      }

      const historicalValues = historicalResult.values;

      await prisma.$transaction(async (tx) => {
        const property = await tx.property.upsert({
          where: {
            sourceKey,
          },
          update: {
            publicationStatus: "DRAFT",
            name,
            location: county,
            county,
            address,
            postalCode,

            type: propertyType,
            saleType: cleanString(row["Sold times"]),

            status,
            stage,

            priceMin: price,
            priceMax: price,

            bedroomsMin: Math.round(beds),
            bedroomsMax: Math.round(beds),

            bathroomsMin: Math.round(baths),
            bathroomsMax: Math.round(baths),

            sizeSqm: propertySize,
            sizeCategory: cleanString(row["Property Size Category"]) || null,

            completionYear:
              completionYear !== null
                ? Math.round(completionYear)
                : null,

            description:
              cleanString(row.Description) || null,

            agentId,
          },

          create: {
            sourceKey,
            publicationStatus: "DRAFT",

            name,
            location: county,
            county,
            address,
            postalCode,

            type: propertyType,
            saleType: cleanString(row["Sold times"]),

            status,
            stage,

            priceMin: price,
            priceMax: price,

            bedroomsMin: Math.round(beds),
            bedroomsMax: Math.round(beds),

            bathroomsMin: Math.round(baths),
            bathroomsMax: Math.round(baths),

            sizeSqm: propertySize,
            sizeCategory: cleanString(row["Property Size Category"]) || null,

            completionYear:
              completionYear !== null
                ? Math.round(completionYear)
                : null,

            description:
              cleanString(row.Description) || null,

            agentId,
          },
        });

        await tx.propertyValueHistory.deleteMany({
          where: {
            propertyId: property.id,
          },
        });

        for (let i = 0; i < historicalValues.length; i++) {
          const current = historicalValues[i];
          const previous = historicalValues[i - 1]?.value;

          await tx.propertyValueHistory.create({
            data: {
              propertyId: property.id,
              year: current.year,
              value: current.value,
              growthPercent: calculateGrowth(
                current.value,
                previous
              ),
            },
          });
          historyImported++;
        }
      });

      imported++;
    }

    console.log(
      `Processed ${Math.min(
        start + BATCH_SIZE,
        rows.length
      ).toLocaleString()} / ${rows.length.toLocaleString()} rows`
    );
  }
  const importedProperties = await prisma.property.findMany({
  orderBy: {
    createdAt: "asc",
  },
  take: IMPORT_LIMIT,
  include: {
    agent: true,
    valueHistory: true,
  },
});

fs.writeFileSync(
  "imported-properties-1000.json",
  JSON.stringify(importedProperties, null, 2),
  "utf-8"
);

console.log(
  `Saved ${importedProperties.length} imported properties to imported-properties-1000.json`
);

  console.log("");
  console.log("======================================");
  console.log("PROPERTY IMPORT COMPLETE");
  console.log("======================================");
  console.log(`Properties imported: ${imported.toLocaleString()}`);
  console.log(`Rows skipped:        ${skipped.toLocaleString()}`);
  console.log(
    `History rows imported: ${historyImported.toLocaleString()}`
  );
  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("IMPORT FAILED");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });