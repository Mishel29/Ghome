import express from "express";
import cors from "cors";
import { createHandler } from "graphql-http/lib/use/express";
import { buildSchema } from "graphql";
import { prisma } from "./lib/prisma.js";
import "dotenv/config";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import XLSX from "xlsx";
import { validateHistoricalPrices } from "./import/historicalPrices.js";
import { validatePropertyCsvHeaders } from "./import/propertyCsvSchema.js";

const app = express();

app.use(cors());
const schema = buildSchema(`
  enum PropertyStatus {
    DRAFT
    COMING_SOON
    ON_SALE
    SOLD_OUT
    OFFLINE
  }

  enum PropertyStage {
    PLANNING
    UNDER_CONSTRUCTION
    READY_TO_MOVE
  }

  enum SubscriberStatus {
    PENDING
    ACTIVE
    UNSUBSCRIBED
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    createdAt: String!
  }

  type PropertyMedia {
    id: ID!
    url: String!
    type: String!
    isPrimary: Boolean!
    sortOrder: Int!
    altText: String
    aiJobId: ID
  }

  type Feature {
    id: ID!
    name: String!
  }

  type PropertyValueHistory {
    id: ID!
    year: Int!
    value: Float!
    growthPercent: Float
    isSynthetic: Boolean!
    source: String
  }

  type PropertyHistoricalPrice {
    year: Int!
    price: Float!
  }

  input HistoricalPriceInput {
    year: Int!
    price: Float!
  }

  input PropertyMediaInput {
    url: String!
    altText: String
  }

  input InterestInput {
    propertyId: ID!
    name: String!
    email: String!
    phone: String
    message: String!
    consent: Boolean!
    campaignToken: String
  }

  input InterestFilter {
    propertyId: ID
    propertyName: String
    location: String
    agentId: ID
    from: String
    to: String
    pendingOnly: Boolean
    offset: Int
    limit: Int
  }

  input SubscriberFilter {
    search: String
    status: SubscriberStatus
    offset: Int
    limit: Int
  }

  input SubscriberInput {
    name: String!
    email: String!
    phone: String
    consent: Boolean!
  }

  input FollowUpInput {
    interestId: ID!
    subject: String!
    body: String!
    templateId: ID
  }

  type Subscriber {
    id: ID!
    name: String!
    email: String!
    phone: String
    status: SubscriberStatus!
    consentGrantedAt: String
    consentVersion: String
    subscribedAt: String
    unsubscribedAt: String
  }

  type SubscriberConnection {
    nodes: [Subscriber!]!
    totalCount: Int!
    activeCount: Int!
    unsubscribedCount: Int!
  }

  type InterestProperty {
    id: ID!
    name: String!
    location: String
    status: PropertyStatus!
  }

  type InterestAgent { id: ID!, name: String! }
  type InterestFollowUp { id: ID!, interestId: ID!, subject: String!, body: String!, status: String!, sendRequestedAt: String, sentAt: String, failedAt: String, errorMessage: String, createdAt: String! }

  type Interest {
    id: ID!
    propertyId: ID!
    name: String!
    email: String!
    phone: String
    message: String
    dataConsent: Boolean!
    followUpSent: Boolean!
    createdAt: String!
    property: InterestProperty!
    agent: InterestAgent
    followUps: [InterestFollowUp!]!
  }

  type InterestConnection {
    nodes: [Interest!]!
    totalCount: Int!
    pendingCount: Int!
  }

  type InterestDay {
    date: String!
    interests: Int!
    followUps: Int!
  }

  type InterestStats {
    total: Int!
    averagePerDay: Float!
    totalFollowUps: Int!
    averageFollowUpsPerDay: Float!
    days: [InterestDay!]!
  }

  type InterestGroup { property: InterestProperty!, totalCount: Int!, pendingCount: Int! }

  input HouseTypeInput {
    name: String!
    agentName: String
    sourceKey: String
    agentId: ID
    sizeCategory: String
    completionYear: Int
    features: [String!]
    slug: String
    developmentId: ID
    location: String
    county: String
    address: String
    postalCode: String
    type: String
    saleType: String
    status: PropertyStatus
    stage: PropertyStage
    priceMin: Float
    priceMax: Float
    bedroomsMin: Int
    bedroomsMax: Int
    bathroomsMin: Int
    bathroomsMax: Int
    sizeSqm: Float
    sizeSqmMax: Float
    bedroomOptions: [Int!]
    bathroomOptions: [Int!]
    description: String
    listedDate: String
    images: [PropertyMediaInput!]
    historicalPrices: [HistoricalPriceInput!]
  }

  type Property {
    id: ID!
    sourceKey: String
    agentId: ID
    name: String!
    location: String
    county: String
    address: String
    postalCode: String

    type: String
    saleType: String

    status: PropertyStatus!
    stage: PropertyStage

    priceMin: Float
    priceMax: Float

    bedroomsMin: Int
    bedroomsMax: Int

    bathroomsMin: Int
    bathroomsMax: Int

    sizeSqm: Float
    sizeSqmMax: Float
    sizeCategory: String
    publicationStatus: String!
    publishedAt: String
    slug: String
    developmentId: ID
    bedroomOptions: [Int!]!
    bathroomOptions: [Int!]!

    completionYear: Int

    description: String

    agent: User

    media: [PropertyMedia!]!
    features: [Feature!]!
    valueHistory: [PropertyValueHistory!]!
    historicalPrices: [PropertyHistoricalPrice!]!

    listedDate: String
    createdAt: String!
    updatedAt: String!
    clickCount: Int!
    interestCount: Int!
    pendingInterestCount: Int!
    saveCount: Int!
    campaigned: Boolean!
  }

  input PropertyFilterInput {
  search: String
  location: String
  county: String
  postalCode: String
  type: String
  saleType: String
  status: PropertyStatus
  stage: PropertyStage
  minPrice: Float
  maxPrice: Float
  minBedrooms: Int
  maxBedrooms: Int
  minBathrooms: Int
  maxBathrooms: Int
  completionYear: Int
  listedFrom: String
  listedTo: String
  sort: String
}

type PropertyConnection {
  nodes: [Property!]!
  totalCount: Int!
}

  type AuthPayload {
    token: String!
    user: User!
  }

  type AdminDashboard {
    properties: Int!
    publishedProperties: Int!
    subscribers: Int!
    unsubscribers: Int!
    campaigns: Int!
    sentCampaigns: Int!
    interests: Int!
    pendingInterests: Int!
    news: Int!
    users: Int!
  }

  type CampaignDay {
    date: String!
    sent: Int!
    clicks: Int!
    interests: Int!
    unsubscribes: Int!
    clickRate: Float!
    interestRate: Float!
  }

  type ImportError {
    rowNumber: Int
    field: String!
    value: String
    message: String!
    errorType: String!
  }

  type CsvHeaderResult {
    valid: Boolean!
    expectedColumns: [String!]!
    requiredColumns: [String!]!
    receivedColumns: [String!]!
    missingColumns: [String!]!
    unknownColumns: [String!]!
    duplicateColumns: [String!]!
    emptyColumns: [Int!]!
  }

  type CsvValidation {
    valid: Boolean!
    totalRows: Int!
    validRows: Int!
    invalidRows: Int!
    totalErrors: Int!
    errorsTruncated: Boolean!
    schema: CsvHeaderResult!
    errors: [ImportError!]!
  }

  type PropertyUpload {
    id: ID!
    filename: String!
    status: String!
    byteSize: Int!
    expiresAt: String!
    validation: CsvValidation
  }

  type ImportBatch {
    id: ID!
    chunkIndex: Int!
    totalRows: Int!
    processedRows: Int!
    status: String!
    attempts: Int!
    lastError: String
  }

  type PropertyImport {
    id: ID!
    filename: String!
    status: String!
    createdAt: String!
    startedAt: String
    completedAt: String
    adminName: String!
    totalRows: Int!
    totalJobs: Int!
    completedJobs: Int!
    failedJobs: Int!
    waitingJobs: Int!
    activeJobs: Int!
    retryingJobs: Int!
    successfulRows: Int!
    failedRows: Int!
    percentage: Float!
    errorSummary: String
    queueWarning: String
    chunks: [ImportBatch!]!
    rowErrors: [ImportError!]!
    errorCount: Int!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    uploadPropertyCsv(filename: String!, contentBase64: String!): PropertyUpload!
    validatePropertyCsv(uploadId: ID!): PropertyUpload!
    cancelPropertyUpload(uploadId: ID!): Boolean!
    startPropertyImport(uploadId: ID!): PropertyImport!
    saveProperty(id: ID, input: HouseTypeInput!): Property!
    publishProperty(id: ID!): Property!
    deleteProperty(id: ID!): Boolean!
    setPropertySaved(propertyId: ID!, saved: Boolean!, campaignToken: String): Boolean!
    recordPropertyView(propertyId: ID!): Boolean!
    submitInterest(input: InterestInput!): Interest!
    addSubscriber(input: SubscriberInput!): Subscriber!
    saveFollowUp(id: ID, input: FollowUpInput!): InterestFollowUp!
    sendFollowUp(id: ID!): InterestFollowUp!
  }

type Query {
  properties(
    filter: PropertyFilterInput
    limit: Int
    offset: Int
  ): PropertyConnection!

  property(id: ID!): Property
  adminProperties(
    filter: PropertyFilterInput
    limit: Int
    offset: Int
  ): PropertyConnection!
  adminProperty(id: ID!): Property
  adminDashboard: AdminDashboard!
  campaignStats: [CampaignDay!]!
  propertyImportUpload(id: ID!): PropertyUpload!
  propertyImportStatus(id: ID!, jobOffset: Int, errorOffset: Int): PropertyImport!
  propertyImportHistory: [PropertyImport!]!
  me: User!
  savedProperties: [Property!]!
  interestsPage(input: InterestFilter): InterestConnection!
  interestStats(input: InterestFilter): InterestStats!
  interestGroups(input: InterestFilter): [InterestGroup!]!
  agents: [User!]!
  subscribersPage(input: SubscriberFilter): SubscriberConnection!
}
`);

function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function passwordMatches(password: string, hash: string | null) {
  if (!hash) return false;
  const [algorithm, salt, encoded] = hash.split(":");
  if (algorithm !== "scrypt" || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function requireAdmin(context: { token?: string }) {
  if (!context.token) throw new Error("Authentication required");
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenDigest(context.token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date() || session.user.role !== "ADMIN") {
    throw new Error("Administrator authentication required");
  }
  return session.user;
}

function uploadResult(upload: { id: string; filename: string; status: string; byteSize: number; expiresAt: Date; validation: unknown }) {
  return {
    ...upload,
    expiresAt: upload.expiresAt.toISOString(),
    validation: upload.validation ?? null,
  };
}

function validateUploadedPropertyCsv(contentBase64: string) {
  const workbook = XLSX.read(Buffer.from(contentBase64, "base64"), { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("CSV does not contain a worksheet");
  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  const schema = validatePropertyCsvHeaders(headerRows[0] ?? []);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const errors: Array<{ rowNumber: number; field: string; value: string | null; message: string; errorType: string }> = [];
  let validRows = 0;
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const number = (value: unknown) => value === null || value === undefined || value === "" ? null : Number(value);
    const price = number(row.Price);
    const propertySize = number(row["Property Size"]);
    const beds = number(row.Beds);
    const baths = number(row.Baths);
    const completionYear = number(row["Completion Year"]);
    const required = [
      ["Name", row.Name], ["Address", row.Address], ["County", row.County], ["Property Type", row["Property Type"]],
      ["Status", row.Status], ["Stage", row.Stage], ["Price", price], ["Property Size", propertySize], ["Beds", beds], ["Baths", baths],
    ];
    const rowErrors = required.filter(([, value]) => value === null || value === undefined || value === "" || (typeof value === "number" && !Number.isFinite(value))).map(([field, value]) => ({ rowNumber, field: String(field), value: value == null ? null : String(value), message: `${String(field)} is required and must be valid.`, errorType: "FIELD" }));
    const history = validateHistoricalPrices(row.Years, row["Historical Prices"], completionYear, price);
    rowErrors.push(...history.issues.map((issue) => ({ rowNumber, field: issue.field, value: null, message: issue.message, errorType: "HISTORICAL_PRICE" })));
    if (rowErrors.length) errors.push(...rowErrors);
    else validRows++;
  }
  const allErrors = [
    ...(!schema.valid ? [{ rowNumber: 0, field: "CSV", value: null, message: "CSV headers do not match the required property schema.", errorType: "HEADER" }] : []),
    ...errors,
  ];
  return {
    valid: schema.valid && errors.length === 0,
    totalRows: rows.length,
    validRows: schema.valid ? validRows : 0,
    invalidRows: schema.valid ? rows.length - validRows : rows.length,
    totalErrors: allErrors.length,
    errorsTruncated: allErrors.length > 100,
    schema,
    errors: allErrors.slice(0, 100),
    rows,
  };
}

function importStatus(job: { id: string; filename: string; status: string; createdAt: Date; startedAt: Date | null; completedAt: Date | null; totalRows: number; totalJobs: number; completedJobs: number; failedJobs: number; successfulRows: number; failedRows: number; errorSummary: string | null; createdBy: { name: string } | null; errors: unknown }) {
  const totalRows = job.totalRows;
  const processed = job.successfulRows + job.failedRows;
  return {
    id: job.id,
    filename: job.filename,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    adminName: job.createdBy?.name ?? "Administrator",
    totalRows,
    totalJobs: job.totalJobs,
    completedJobs: job.completedJobs,
    failedJobs: job.failedJobs,
    waitingJobs: 0,
    activeJobs: 0,
    retryingJobs: 0,
    successfulRows: job.successfulRows,
    failedRows: job.failedRows,
    percentage: totalRows ? Math.round((processed / totalRows) * 100) : 100,
    errorSummary: job.errorSummary,
    queueWarning: null,
    chunks: [],
    rowErrors: Array.isArray(job.errors) ? job.errors : [],
    errorCount: Array.isArray(job.errors) ? job.errors.length : 0,
  };
}

function importText(value: unknown) {
  return String(value ?? "").trim();
}

function importNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function importStatusValue(value: unknown) {
  const normalized = importText(value).toLowerCase();
  return ({ draft: "DRAFT", "coming soon": "COMING_SOON", "on sale": "ON_SALE", "sold out": "SOLD_OUT", offline: "OFFLINE" } as Record<string, string>)[normalized] ?? "DRAFT";
}

function importStageValue(value: unknown) {
  const normalized = importText(value).toLowerCase();
  return ({ planning: "PLANNING", "under construction": "UNDER_CONSTRUCTION", "ready to move": "READY_TO_MOVE", "ready to move-in": "READY_TO_MOVE" } as Record<string, string>)[normalized] ?? null;
}

async function importPropertiesFromUpload(uploadId: string, adminId: string) {
  const upload = await prisma.propertyImportUpload.findUniqueOrThrow({ where: { id: uploadId } });
  const rows = Array.isArray(upload.validatedRows) ? upload.validatedRows as Array<Record<string, unknown>> : [];
  const job = await prisma.importJob.create({ data: { type: "PROPERTY_IMPORT", status: "PROCESSING", filename: upload.filename, totalRows: rows.length, totalJobs: 1, startedAt: new Date(), createdById: adminId, uploadId } });
  let successfulRows = 0;
  const errors: Array<Record<string, unknown>> = [];
  for (const [index, row] of rows.entries()) {
    try {
      const price = importNumber(row.Price);
      const size = importNumber(row["Property Size"]);
      const beds = importNumber(row.Beds);
      const baths = importNumber(row.Baths);
      const completionYear = importNumber(row["Completion Year"]);
      const history = validateHistoricalPrices(row.Years, row["Historical Prices"], completionYear, price);
      if (history.issues.length || price === null || size === null || beds === null || baths === null) throw new Error(history.issues.map((issue) => issue.message).join(" ") || "Invalid property values");
      const agentName = importText(row.Agent);
      const agent = agentName ? await prisma.user.upsert({ where: { email: `${agentName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@harborstone.ie` }, update: { name: agentName, role: "AGENT" }, create: { name: agentName, email: `${agentName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@harborstone.ie`, role: "AGENT" } }) : null;
      await prisma.$transaction(async (tx) => {
        const location = importText(row.County) || null;
        const property = await tx.property.upsert({ where: { sourceKey: `upload-${uploadId}-row-${index + 2}` }, update: { name: importText(row.Name), location, address: importText(row.Address), county: importText(row.County), postalCode: importText(row["Postal Code"]), type: importText(row["Property Type"]), saleType: importText(row["Sold times"]), status: importStatusValue(row.Status) as never, stage: importStageValue(row.Stage) as never, priceMin: price, priceMax: price, sizeSqm: size, bedroomsMin: Math.round(beds), bedroomsMax: Math.round(beds), bathroomsMin: Math.round(baths), bathroomsMax: Math.round(baths), completionYear: completionYear === null ? null : Math.round(completionYear), sizeCategory: importText(row["Property Size Category"]) || null, description: importText(row.Description) || null, agentId: agent?.id ?? null }, create: { sourceKey: `upload-${uploadId}-row-${index + 2}`, name: importText(row.Name), location, address: importText(row.Address), county: importText(row.County), postalCode: importText(row["Postal Code"]), type: importText(row["Property Type"]), saleType: importText(row["Sold times"]), status: importStatusValue(row.Status) as never, stage: importStageValue(row.Stage) as never, priceMin: price, priceMax: price, sizeSqm: size, bedroomsMin: Math.round(beds), bedroomsMax: Math.round(beds), bathroomsMin: Math.round(baths), bathroomsMax: Math.round(baths), completionYear: completionYear === null ? null : Math.round(completionYear), sizeCategory: importText(row["Property Size Category"]) || null, description: importText(row.Description) || null, agentId: agent?.id ?? null } });
        await tx.propertyValueHistory.deleteMany({ where: { propertyId: property.id } });
        await tx.propertyValueHistory.createMany({ data: history.values.map((item, historyIndex) => ({ propertyId: property.id, year: item.year, value: item.value, growthPercent: historyIndex === 0 || history.values[historyIndex - 1].value === 0 ? null : ((item.value - history.values[historyIndex - 1].value) / history.values[historyIndex - 1].value) * 100 })) });
      });
      successfulRows++;
    } catch (error) {
      errors.push({ rowNumber: index + 2, field: "row", value: null, message: error instanceof Error ? error.message : "Import failed", errorType: "IMPORT" });
    }
  }
  await prisma.importJob.update({ where: { id: job.id }, data: { status: errors.length ? successfulRows ? "PARTIALLY_COMPLETED" : "FAILED" : "COMPLETED", successfulRows, failedRows: errors.length, completedJobs: 1, completedAt: new Date(), errors: errors as unknown as import("./generated/client.js").Prisma.InputJsonValue } });
  await prisma.propertyImportUpload.update({ where: { id: uploadId }, data: { status: "CONSUMED" } });
  const updated = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id }, include: { createdBy: true } });
  return importStatus(updated);
}

function serializeProperty<T extends { features: Array<{ feature: unknown }>; valueHistory: Array<{ year: number; value: unknown }>; publicationStatus?: string | null; bedroomOptions?: number[] | null; bathroomOptions?: number[] | null }>(property: T) {
  return {
    ...property,
    publicationStatus: property.publicationStatus ?? "DRAFT",
    bedroomOptions: property.bedroomOptions ?? [],
    bathroomOptions: property.bathroomOptions ?? [],
    clickCount: 0,
    interestCount: 0,
    pendingInterestCount: 0,
    saveCount: 0,
    campaigned: false,
    features: property.features.map((item) => item.feature),
    historicalPrices: property.valueHistory.map((item) => ({
      year: item.year,
      price: Number(item.value),
    })),
  };
}

const root = {
  login: async ({ email, password }: { email: string; password: string }) => {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !passwordMatches(password, user.passwordHash)) {
      throw new Error("Invalid credentials");
    }
    const token = randomBytes(32).toString("hex");
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: tokenDigest(token),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  },
  logout: async (_args: unknown, context: { token?: string }) => {
    if (context.token) {
      await prisma.session.deleteMany({ where: { tokenHash: tokenDigest(context.token) } });
    }
    return true;
  },
  saveProperty: async ({ id, input }: { id?: string; input: Record<string, any> }, context: { token?: string }) => {
    await requireAdmin(context);
    const history = Array.isArray(input.historicalPrices) ? input.historicalPrices : [];
    const price = input.priceMin ?? input.priceMax ?? null;
    const historyResult = validateHistoricalPrices(
      JSON.stringify(history.map((item) => item.year)),
      JSON.stringify(history.map((item) => item.price)),
      input.completionYear ?? null,
      price,
    );
    if (historyResult.issues.length) throw new Error(historyResult.issues.map((issue) => issue.message).join(" "));
    const agentName = String(input.agentName ?? "").trim();
    const agent = agentName
      ? await prisma.user.upsert({
          where: { email: `${agentName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@harborstone.ie` },
          update: { name: agentName, role: "AGENT" },
          create: { name: agentName, email: `${agentName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@harborstone.ie`, role: "AGENT" },
        })
      : null;
    const scalar = {
      name: input.name,
      sourceKey: input.sourceKey ?? null,
      agentId: agent?.id ?? input.agentId ?? null,
      sizeCategory: input.sizeCategory ?? null,
      completionYear: input.completionYear ?? null,
      slug: input.slug ?? null,
      developmentId: input.developmentId ?? null,
      location: input.location ?? null,
      county: input.county ?? null,
      address: input.address ?? null,
      postalCode: input.postalCode ?? null,
      type: input.type ?? null,
      saleType: input.saleType ?? null,
      status: input.status ?? "DRAFT",
      stage: input.stage ?? null,
      priceMin: input.priceMin ?? null,
      priceMax: input.priceMax ?? input.priceMin ?? null,
      bedroomsMin: input.bedroomsMin ?? null,
      bedroomsMax: input.bedroomsMax ?? input.bedroomsMin ?? null,
      bathroomsMin: input.bathroomsMin ?? null,
      bathroomsMax: input.bathroomsMax ?? input.bathroomsMin ?? null,
      sizeSqm: input.sizeSqm ?? null,
      sizeSqmMax: input.sizeSqmMax ?? input.sizeSqm ?? null,
      bedroomOptions: input.bedroomOptions ?? [],
      bathroomOptions: input.bathroomOptions ?? [],
      description: input.description ?? null,
      listedDate: input.listedDate ? new Date(input.listedDate) : null,
      publicationStatus: "DRAFT" as const,
    };
    const property = await prisma.$transaction(async (tx) => {
      const row = id
        ? await tx.property.update({ where: { id }, data: scalar })
        : await tx.property.create({ data: scalar });

      if (input.images) {
        await tx.propertyMedia.deleteMany({ where: { propertyId: row.id, type: "IMAGE" } });
        if (input.images.length) {
          await tx.propertyMedia.createMany({
            data: input.images.map((image: { url: string; altText?: string }, index: number) => ({
              propertyId: row.id,
              url: image.url,
              altText: image.altText ?? null,
              type: "IMAGE" as const,
              isPrimary: index === 0,
              sortOrder: index,
            })),
          });
        }
      }

      if (input.features) {
        await tx.propertyFeature.deleteMany({ where: { propertyId: row.id } });
        for (const name of input.features as string[]) {
          const feature = await tx.feature.upsert({
            where: { name },
            update: {},
            create: { name },
          });
          await tx.propertyFeature.create({
            data: {
              propertyId: row.id,
              featureId: feature.id,
            },
          });
        }
      }
      await tx.propertyValueHistory.deleteMany({ where: { propertyId: row.id } });
      if (historyResult.values.length) await tx.propertyValueHistory.createMany({ data: historyResult.values.map((item, index) => ({ propertyId: row.id, year: item.year, value: item.value, growthPercent: index && historyResult.values[index - 1].value ? ((item.value - historyResult.values[index - 1].value) / historyResult.values[index - 1].value) * 100 : null })) });
      return tx.property.findUniqueOrThrow({ where: { id: row.id }, include: { agent: true, media: true, features: { include: { feature: true } }, valueHistory: { orderBy: { year: "asc" } } } });
    });
    return serializeProperty(property);
  },
  publishProperty: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const property = await prisma.property.update({ where: { id }, data: { publicationStatus: "PUBLISHED", publishedAt: new Date() }, include: { agent: true, media: true, features: { include: { feature: true } }, valueHistory: { orderBy: { year: "asc" } } } });
    return serializeProperty(property);
  },
  deleteProperty: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    await prisma.property.delete({ where: { id } });
    return true;
  },
  me: async (_args: unknown, context: { token?: string }) => {
    const user = await requireAdmin(context);
    return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() };
  },
  savedProperties: async (_args: unknown, context: { token?: string }) => {
    const user = await requireAdmin(context);
    const records = await prisma.savedProperty.findMany({ where: { userId: user.id }, include: { property: { include: { agent: true, media: true, features: { include: { feature: true } }, valueHistory: { orderBy: { year: "asc" } } } } }, orderBy: { createdAt: "desc" } });
    return records.map((record) => serializeProperty(record.property));
  },
  setPropertySaved: async ({ propertyId, saved }: { propertyId: string; saved: boolean }, context: { token?: string }) => {
    const user = await requireAdmin(context);
    if (saved) await prisma.savedProperty.upsert({ where: { userId_propertyId: { userId: user.id, propertyId } }, create: { userId: user.id, propertyId }, update: {} });
    else await prisma.savedProperty.deleteMany({ where: { userId: user.id, propertyId } });
    return saved;
  },
  recordPropertyView: async ({ propertyId }: { propertyId: string }) => {
    await prisma.analyticsEvent.create({ data: { propertyId, eventType: "PROPERTY_VIEW" } });
    return true;
  },
  submitInterest: async ({ input }: { input: { propertyId: string; name: string; email: string; phone?: string; message: string; consent: boolean } }, context: { token?: string }) => {
    if (!input.consent) throw new Error("Consent is required to submit interest");
    const property = await prisma.property.findFirst({ where: { id: input.propertyId, publicationStatus: "PUBLISHED" }, select: { id: true, name: true, location: true, status: true, agentId: true } });
    if (!property) throw new Error("Property is not available");
    const email = input.email.trim().toLowerCase();
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const subscriber = await tx.subscriber.upsert({
        where: { email },
        create: { name: input.name.trim(), email, phone: input.phone?.trim() || null, status: "ACTIVE", subscribedAt: now, consentGrantedAt: now, consentVersion: "interest-v1" },
        update: { name: input.name.trim(), phone: input.phone?.trim() || null, status: "ACTIVE", subscribedAt: now, consentGrantedAt: now, consentVersion: "interest-v1", unsubscribedAt: null },
      });
      await tx.consent.create({ data: { subscriberId: subscriber.id, type: "INTEREST", granted: true, version: "interest-v1", source: "property-interest" } });
      const interest = await tx.interest.create({ data: { propertyId: property.id, userId: null, agentId: property.agentId, name: input.name.trim(), email, phone: input.phone?.trim() || null, message: input.message.trim(), dataConsent: true } });
      return interest;
    });
    return { ...result, createdAt: result.createdAt.toISOString(), property };
  },
  addSubscriber: async ({ input }: { input: { name: string; email: string; phone?: string; consent: boolean } }, context: { token?: string }) => {
    await requireAdmin(context);
    if (!input.consent) throw new Error("Explicit marketing consent is required");
    const email = input.email.trim().toLowerCase();
    const now = new Date();
    const subscriber = await prisma.subscriber.upsert({
      where: { email },
      create: { name: input.name.trim(), email, phone: input.phone?.trim() || null, status: "ACTIVE", subscribedAt: now, consentGrantedAt: now, consentVersion: "marketing-v1" },
      update: { name: input.name.trim(), phone: input.phone?.trim() || null, status: "ACTIVE", subscribedAt: now, unsubscribedAt: null, consentGrantedAt: now, consentVersion: "marketing-v1" },
    });
    await prisma.consent.create({ data: { subscriberId: subscriber.id, type: "MARKETING", granted: true, version: "marketing-v1", source: "admin-registration" } });
    return { ...subscriber, consentGrantedAt: subscriber.consentGrantedAt?.toISOString() ?? null, subscribedAt: subscriber.subscribedAt?.toISOString() ?? null, unsubscribedAt: null };
  },
  saveFollowUp: async ({ id, input }: { id?: string; input: { interestId: string; subject: string; body: string; templateId?: string } }, context: { token?: string }) => {
    const admin = await requireAdmin(context);
    const data = { interestId: input.interestId, subject: input.subject.trim(), body: input.body.trim(), templateId: input.templateId ?? null, sentById: admin.id };
    const followUp = id
      ? await prisma.interestFollowUp.update({ where: { id }, data })
      : await prisma.interestFollowUp.create({ data });
    return { ...followUp, createdAt: followUp.createdAt.toISOString(), sendRequestedAt: followUp.sendRequestedAt?.toISOString() ?? null, sentAt: followUp.sentAt?.toISOString() ?? null, failedAt: followUp.failedAt?.toISOString() ?? null };
  },
  sendFollowUp: async ({ id }: { id: string }, context: { token?: string }) => {
    const admin = await requireAdmin(context);
    const followUp = await prisma.$transaction(async (tx) => {
      const current = await tx.interestFollowUp.findUniqueOrThrow({ where: { id } });
      const now = new Date();
      const sent = await tx.interestFollowUp.update({ where: { id }, data: { status: "SENT", sendRequestedAt: now, sentAt: now, sentById: admin.id } });
      await tx.interest.update({ where: { id: current.interestId }, data: { followUpSent: true } });
      return sent;
    });
    return { ...followUp, createdAt: followUp.createdAt.toISOString(), sendRequestedAt: followUp.sendRequestedAt?.toISOString() ?? null, sentAt: followUp.sentAt?.toISOString() ?? null, failedAt: followUp.failedAt?.toISOString() ?? null };
  },
  interestsPage: async ({ input }: { input?: { propertyId?: string; propertyName?: string; location?: string; agentId?: string; from?: string; to?: string; pendingOnly?: boolean; offset?: number; limit?: number } }, context: { token?: string }) => {
    await requireAdmin(context);
    const offset = input?.offset ?? 0;
    const limit = input?.limit ?? 20;
    const where = {
      ...(input?.propertyId ? { propertyId: input.propertyId } : {}),
        ...(input?.propertyName || input?.location ? {
          property: {
            ...(input.propertyName ? { name: { contains: input.propertyName, mode: "insensitive" as const } } : {}),
            ...(input.location ? { location: { contains: input.location, mode: "insensitive" as const } } : {}),
          },
        } : {}),
        ...(input?.agentId ? { agentId: input.agentId } : {}),
        ...(input?.from || input?.to ? { createdAt: { ...(input.from ? { gte: new Date(input.from) } : {}), ...(input.to ? { lte: new Date(`${input.to}T23:59:59.999Z`) } : {}) } } : {}),
      ...(input?.pendingOnly ? { followUpSent: false } : {}),
    };
    const [nodes, totalCount, pendingCount] = await Promise.all([
      prisma.interest.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: "desc" }, include: { property: true, agent: true, followUps: true } }),
      prisma.interest.count({ where }),
      prisma.interest.count({ where: { ...where, followUpSent: false } }),
    ]);
    return {
      nodes: nodes.map((interest) => ({ ...interest, createdAt: interest.createdAt.toISOString(), property: { id: interest.property.id, name: interest.property.name, location: interest.property.location, status: interest.property.status }, agent: interest.agent ? { id: interest.agent.id, name: interest.agent.name } : null, followUps: interest.followUps.map((followUp) => ({ ...followUp, createdAt: followUp.createdAt.toISOString(), sendRequestedAt: followUp.sendRequestedAt?.toISOString() ?? null, sentAt: followUp.sentAt?.toISOString() ?? null, failedAt: followUp.failedAt?.toISOString() ?? null })) })),
      totalCount,
      pendingCount,
    };
  },
  interestStats: async ({ input }: { input?: { propertyId?: string; propertyName?: string; location?: string; agentId?: string; from?: string; to?: string; pendingOnly?: boolean } }, context: { token?: string }) => {
    await requireAdmin(context);
    const where = {
      ...(input?.propertyId ? { propertyId: input.propertyId } : {}),
      ...(input?.propertyName || input?.location ? { property: { ...(input.propertyName ? { name: { contains: input.propertyName, mode: "insensitive" as const } } : {}), ...(input.location ? { location: { contains: input.location, mode: "insensitive" as const } } : {}) } } : {}),
      ...(input?.agentId ? { agentId: input.agentId } : {}),
      ...(input?.from || input?.to ? { createdAt: { ...(input.from ? { gte: new Date(input.from) } : {}), ...(input.to ? { lte: new Date(`${input.to}T23:59:59.999Z`) } : {}) } } : {}),
      ...(input?.pendingOnly ? { followUpSent: false } : {}),
    };
    const rows = await prisma.interest.findMany({ where, select: { createdAt: true, followUps: { select: { sentAt: true, sendRequestedAt: true } } }, orderBy: { createdAt: "asc" } });
    const start = input?.from ? new Date(`${input.from}T00:00:00.000Z`) : rows[0] ? new Date(rows[0].createdAt.toISOString().slice(0, 10) + "T00:00:00.000Z") : new Date();
    const end = input?.to ? new Date(`${input.to}T00:00:00.000Z`) : new Date(start);
    const interestCounts = new Map<string, number>();
    const followUpCounts = new Map<string, number>();
    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      interestCounts.set(date, (interestCounts.get(date) ?? 0) + 1);
      for (const followUp of row.followUps) {
        const followUpDate = (followUp.sentAt ?? followUp.sendRequestedAt)?.toISOString().slice(0, 10);
        if (followUpDate) followUpCounts.set(followUpDate, (followUpCounts.get(followUpDate) ?? 0) + 1);
      }
    }
    const days: Array<{ date: string; interests: number; followUps: number }> = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = cursor.toISOString().slice(0, 10);
      days.push({ date, interests: interestCounts.get(date) ?? 0, followUps: followUpCounts.get(date) ?? 0 });
    }
    const dayCount = Math.max(days.length, 1);
    const totalFollowUps = Array.from(followUpCounts.values()).reduce((sum, count) => sum + count, 0);
    return { total: rows.length, averagePerDay: rows.length / dayCount, totalFollowUps, averageFollowUpsPerDay: totalFollowUps / dayCount, days };
  },
  agents: async (_args: unknown, context: { token?: string }) => {
    await requireAdmin(context);
    return prisma.user.findMany({ where: { role: "AGENT" }, orderBy: { name: "asc" } });
  },
  subscribersPage: async ({ input }: { input?: { search?: string; status?: "PENDING" | "ACTIVE" | "UNSUBSCRIBED"; offset?: number; limit?: number } }, context: { token?: string }) => {
    await requireAdmin(context);
    const where = {
      ...(input?.status ? { status: input.status } : {}),
      ...(input?.search ? { OR: [{ name: { contains: input.search, mode: "insensitive" as const } }, { email: { contains: input.search, mode: "insensitive" as const } }] } : {}),
    };
    const [nodes, totalCount, activeCount, unsubscribedCount] = await Promise.all([
      prisma.subscriber.findMany({ where, orderBy: { createdAt: "desc" }, skip: input?.offset ?? 0, take: input?.limit ?? 20 }),
      prisma.subscriber.count({ where }),
      prisma.subscriber.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.subscriber.count({ where: { ...where, status: "UNSUBSCRIBED" } }),
    ]);
    return { nodes: nodes.map((subscriber) => ({ ...subscriber, consentGrantedAt: subscriber.consentGrantedAt?.toISOString() ?? null, subscribedAt: subscriber.subscribedAt?.toISOString() ?? null, unsubscribedAt: subscriber.unsubscribedAt?.toISOString() ?? null })), totalCount, activeCount, unsubscribedCount };
  },
  interestGroups: async ({ input }: { input?: { propertyId?: string; pendingOnly?: boolean; offset?: number } }, context: { token?: string }) => {
    await requireAdmin(context);
    const where = { ...(input?.propertyId ? { propertyId: input.propertyId } : {}), ...(input?.pendingOnly ? { followUpSent: false } : {}) };
    const grouped = await prisma.interest.groupBy({ by: ["propertyId"], where, _count: { _all: true } });
    const properties = await prisma.property.findMany({ where: { id: { in: grouped.map((row) => row.propertyId) } } });
    const pending = await prisma.interest.groupBy({ by: ["propertyId"], where: { ...where, followUpSent: false }, _count: { _all: true } });
    return grouped.map((row) => ({ property: properties.find((property) => property.id === row.propertyId), totalCount: row._count._all, pendingCount: pending.find((item) => item.propertyId === row.propertyId)?._count._all ?? 0 })).filter((row) => row.property);
  },
  uploadPropertyCsv: async ({ filename, contentBase64 }: { filename: string; contentBase64: string }, context: { token?: string }) => {
    const admin = await requireAdmin(context);
    if (!/\.csv$/i.test(filename)) throw new Error("Only CSV property files are supported");
    const upload = await prisma.propertyImportUpload.create({
      data: {
        filename,
        type: "PROPERTY_IMPORT",
        byteSize: Buffer.byteLength(contentBase64, "base64"),
        content: contentBase64,
        createdById: admin.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return uploadResult(upload);
  },
  validatePropertyCsv: async ({ uploadId }: { uploadId: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const upload = await prisma.propertyImportUpload.findUniqueOrThrow({ where: { id: uploadId } });
    if (!upload.content) throw new Error("Uploaded CSV content is unavailable");
    const result = validateUploadedPropertyCsv(upload.content);
    const validation = { valid: result.valid, totalRows: result.totalRows, validRows: result.validRows, invalidRows: result.invalidRows, totalErrors: result.totalErrors, errorsTruncated: result.errorsTruncated, schema: result.schema, errors: result.errors };
    const updated = await prisma.propertyImportUpload.update({ where: { id: uploadId }, data: { status: result.valid ? "READY" : "INVALID", validation, validatedRows: result.rows as unknown as import("./generated/client.js").Prisma.InputJsonValue } });
    return uploadResult(updated);
  },
  cancelPropertyUpload: async ({ uploadId }: { uploadId: string }, context: { token?: string }) => {
    await requireAdmin(context);
    await prisma.propertyImportUpload.update({ where: { id: uploadId }, data: { status: "CANCELLED" } });
    return true;
  },
  startPropertyImport: async ({ uploadId }: { uploadId: string }, context: { token?: string }) => {
    const admin = await requireAdmin(context);
    const upload = await prisma.propertyImportUpload.findUniqueOrThrow({ where: { id: uploadId } });
    if (upload.status !== "READY") throw new Error("Upload must pass validation before import");
    return importPropertiesFromUpload(uploadId, admin.id);
  },
  adminDashboard: async (_args: unknown, context: { token?: string }) => {
    await requireAdmin(context);
    const [properties, publishedProperties, subscribers, unsubscribers, campaigns, sentCampaigns, interests, pendingInterests, news, users] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { publicationStatus: "PUBLISHED" } }),
      prisma.subscriber.count({ where: { status: { not: "UNSUBSCRIBED" } } }),
      prisma.subscriber.count({ where: { status: "UNSUBSCRIBED" } }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "SENT" } }),
      prisma.interest.count(),
      prisma.interest.count({ where: { followUpSent: false } }),
      prisma.newsArticle.count(),
      prisma.user.count(),
    ]);
    return { properties, publishedProperties, subscribers, unsubscribers, campaigns, sentCampaigns, interests, pendingInterests, news, users };
  },
  campaignStats: async (_args: unknown, context: { token?: string }) => {
    await requireAdmin(context);
    return [];
  },
  propertyImportUpload: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const upload = await prisma.propertyImportUpload.findUniqueOrThrow({ where: { id } });
    return uploadResult(upload);
  },
  propertyImportStatus: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const job = await prisma.importJob.findUniqueOrThrow({ where: { id }, include: { createdBy: true } });
    return importStatus(job);
  },
  propertyImportHistory: async (_args: unknown, context: { token?: string }) => {
    await requireAdmin(context);
    const jobs = await prisma.importJob.findMany({ where: { type: "PROPERTY_IMPORT" }, orderBy: { createdAt: "desc" }, take: 20, include: { createdBy: true } });
    return jobs.map(importStatus);
  },
  properties: async ({
  filter,
  limit = 20,
  offset = 0,
}: {
  filter?: {
    search?: string;
    location?: string;
    county?: string;
    postalCode?: string;
    type?: string;
    saleType?: string;
    status?: "DRAFT" | "COMING_SOON" | "ON_SALE" | "SOLD_OUT" | "OFFLINE";
    stage?: "PLANNING" | "UNDER_CONSTRUCTION" | "READY_TO_MOVE";
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    maxBedrooms?: number;
    minBathrooms?: number;
    maxBathrooms?: number;
    completionYear?: number;
    listedFrom?: string;
    listedTo?: string;
    sort?: string;
  };
  limit?: number;
  offset?: number;
}, context: { admin?: boolean } = {}) => {
  const where = {
    ...(context.admin ? {} : { publicationStatus: "PUBLISHED" as const }),
    ...(filter?.search
      ? {
          OR: [
            {
              name: {
                contains: filter.search,
                mode: "insensitive" as const,
              },
            },
            {
              address: {
                contains: filter.search,
                mode: "insensitive" as const,
              },
            },
            {
              county: {
                contains: filter.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    ...(filter?.county
      ? {
          county: {
            equals: filter.county,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(filter?.location
      ? {
          location: {
            contains: filter.location,
            mode: "insensitive" as const,
          },
        }
      : {}),

    ...(filter?.postalCode
      ? { postalCode: { contains: filter.postalCode, mode: "insensitive" as const } }
      : {}),

    ...(filter?.type ? { type: { equals: filter.type, mode: "insensitive" as const } } : {}),
    ...(filter?.saleType ? { saleType: { equals: filter.saleType, mode: "insensitive" as const } } : {}),

    ...(filter?.status
      ? {
          status: filter.status,
        }
      : {}),

    ...(filter?.stage
      ? {
          stage: filter.stage,
        }
      : {}),

    ...(filter?.minPrice !== undefined
      ? {
          priceMin: {
            gte: filter.minPrice,
          },
        }
      : {}),

    ...(filter?.maxPrice !== undefined
      ? {
          priceMax: {
            lte: filter.maxPrice,
          },
        }
      : {}),

    ...(filter?.minBedrooms !== undefined
      ? {
          bedroomsMin: {
            gte: filter.minBedrooms,
          },
        }
      : {}),

    ...(filter?.maxBedrooms !== undefined
      ? {
          bedroomsMax: {
            lte: filter.maxBedrooms,
          },
        }
      : {}),

    ...(filter?.minBathrooms !== undefined
      ? { bathroomsMin: { gte: filter.minBathrooms } }
      : {}),

    ...(filter?.maxBathrooms !== undefined
      ? { bathroomsMax: { lte: filter.maxBathrooms } }
      : {}),

    ...(filter?.completionYear !== undefined
      ? { completionYear: filter.completionYear }
      : {}),

    ...(filter?.listedFrom || filter?.listedTo
      ? {
          listedDate: {
            ...(filter.listedFrom ? { gte: new Date(filter.listedFrom) } : {}),
            ...(filter.listedTo ? { lte: new Date(filter.listedTo) } : {}),
          },
        }
      : {}),
  };

  const orderBy = filter?.sort === "oldest"
    ? { createdAt: "asc" as const }
    : filter?.sort === "price-low"
      ? { priceMin: "asc" as const }
      : filter?.sort === "price-high"
        ? { priceMin: "desc" as const }
        : { createdAt: "desc" as const };

  const [properties, totalCount] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy,
      take: Math.min(limit, 100),
      skip: Math.max(offset, 0),
      include: {
        agent: true,
        media: true,
        features: {
          include: {
            feature: true,
          },
        },
        valueHistory: {
          orderBy: {
            year: "asc",
          },
        },
      },
    }),

    prisma.property.count({
      where,
    }),
  ]);

  return {
    nodes: properties.map(serializeProperty),
    totalCount,
  };
},
  adminProperties: async (args: {
    filter?: {
      search?: string;
      county?: string;
      status?: "DRAFT" | "COMING_SOON" | "ON_SALE" | "SOLD_OUT" | "OFFLINE";
      stage?: "PLANNING" | "UNDER_CONSTRUCTION" | "READY_TO_MOVE";
      minPrice?: number;
      maxPrice?: number;
      minBedrooms?: number;
      maxBedrooms?: number;
    };
    limit?: number;
    offset?: number;
  }, context: { token?: string }) => {
    await requireAdmin(context);
    return root.properties(args, { admin: true });
  },
  adminProperty: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    return root.property({ id }, { admin: true });
  },
  property: async ({ id }: { id: string }, context: { admin?: boolean } = {}) => {
    const property = await prisma.property.findFirst({
      where: context.admin ? { id } : { id, publicationStatus: "PUBLISHED" },
    include: {
      agent: true,
      media: true,
      features: {
        include: {
          feature: true,
        },
      },
      valueHistory: {
        orderBy: {
          year: "asc",
        },
      },
    },
  });

  if (!property) {
    return null;
  }

  return {
    ...serializeProperty(property),
  };
},
};
app.all(
  "/graphql",
  createHandler({
    schema,
    rootValue: root,
    context: (request) => ({
      token: request.raw.headers.authorization?.replace(/^Bearer /i, ""),
    }),
  })
);

app.get("/", async (_req, res) => {
  try {
    const propertyCount = await prisma.property.count();

    res.json({
      message: "Harborstone backend is running",
      database: "connected",
      properties: propertyCount,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
});