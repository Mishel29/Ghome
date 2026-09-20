import express from "express";
import cors from "cors";
import { createHandler } from "graphql-http/lib/use/express";
import { buildSchema, GraphQLError } from "graphql";
import { prisma } from "./lib/prisma.js";
import "dotenv/config";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { basename } from "node:path";
import { parse } from "csv-parse/sync";
import { validateHistoricalPrices } from "./import/historicalPrices.js";
import { PROPERTY_CSV_COLUMNS, validatePropertyCsvHeaders } from "./import/propertyCsvSchema.js";
import { calculateSubscriberStats } from "./subscriberStats.js";
import sanitizeHtml from "sanitize-html";
import nodemailer from "nodemailer";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { normalizePersonName, normalizePhone, subscriberNameKey } from "./lib/contact.js";
import { aggregateCampaignStatistics } from "./lib/campaignStatistics.js";
import { campaignClickUrl, campaignOpenUrl, unsubscribeUrl } from "./lib/emailContent.js";
import { assertProductionRuntimeConfiguration, isAllowedCorsOrigin, publicAppUrl } from "./lib/runtimeConfig.js";

export const app = express();

app.set("trust proxy", 1);

const GRAPHQL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const GRAPHQL_RATE_LIMIT = 100000;
const LOGIN_RATE_LIMIT = 200;

function isLoginRequest(req: express.Request) {
  const body = req.body as { query?: unknown; operationName?: unknown } | undefined;
  const operationName = typeof body?.operationName === "string" ? body.operationName : "";
  const query = typeof body?.query === "string" ? body.query : "";

  return operationName.toLowerCase() === "login" || /\blogin\s*\(/.test(query);
}

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedCorsOrigin(origin)),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
}));
app.use((req, res, next) => {
  const contentLength = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 12 * 1024 * 1024) return res.status(413).json({ error: "Request body is too large" });
  next();
});
app.use("/graphql", express.json({ limit: "12mb" }));
app.use("/graphql", rateLimit({
  windowMs: GRAPHQL_RATE_LIMIT_WINDOW_MS,
  limit: LOGIN_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isLoginRequest(req),
}));
app.use("/graphql", rateLimit({
  windowMs: GRAPHQL_RATE_LIMIT_WINDOW_MS,
  limit: GRAPHQL_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
}));
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

  enum PublicationStatus {
    DRAFT
    PUBLISHED
  }

  enum TemplatePurpose {
    CAMPAIGN
    INTEREST_FOLLOW_UP
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    createdAt: String!
  }

  input AdminListInput {
    search: String
    offset: Int
    limit: Int
  }

  type UserConnection {
    nodes: [User!]!
    totalCount: Int!
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    isAdmin: Boolean!
  }

  input NewsInput {
    externalUrl: String
    title: String!
    summary: String
    content: String
    imageUrl: String
    activeFrom: String
    activeUntil: String
    propertyIds: [ID!]
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

  type NewsConnection {
    nodes: [NewsArticle!]!
    totalCount: Int!
  }

  type NewsArticle {
    id: ID!
    externalUrl: String
    title: String!
    summary: String
    content: String
    imageUrl: String
    publicationStatus: String!
    publishedAt: String
    activeFrom: String
    activeUntil: String
    updatedAt: String!
    properties: [Property!]!
    newsClickCount: Int!
    taggedPropertyVisitCount: Int!
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
    status: String
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

  type FileDownload {
    filename: String!
    mimeType: String!
    contentBase64: String!
  }

  type SubscriberDay {
    date: String!
    activeRegistrations: Int!
    registrations: Int!
    unsubscribes: Int!
  }

  type SubscriberStats {
    totalActiveRegistrations: Int!
    totalSubscribers: Int!
    averageActiveRegistrationsPerDay: Float!
    averageSubscribersPerDay: Float!
    totalUnsubscribes: Int!
    totalUnsubscribers: Int!
    averageUnsubscribesPerDay: Float!
    averageUnsubscribersPerDay: Float!
    days: [SubscriberDay!]!
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
  publicationStatus: PublicationStatus
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

  type CampaignTemplate {
    id: ID!
    name: String!
    subject: String
    htmlContent: String!
    purpose: TemplatePurpose!
    propertyIds: [ID!]!
    createdAt: String!
    updatedAt: String!
  }

  type TemplateConnection {
    nodes: [CampaignTemplate!]!
    totalCount: Int!
  }

  type HtmlResult { html: String! }

  enum CampaignStatus { DRAFT QUEUED SENDING SENT PARTIALLY_FAILED FAILED }
  enum DeliveryStatus { PENDING SENDING SENT FAILED SKIPPED }
  input CampaignFilter { search: String, from: String, to: String, status: CampaignStatus, offset: Int, limit: Int }
  input CampaignInput { subject: String!, templateHtml: String, bodyText: String, templateId: ID, propertyIds: [ID!], newsArticleId: ID }
  type CampaignProperty { id: ID!, propertyId: ID, propertyName: String! }
  type CampaignRecipient { id: ID!, recipientEmail: String!, recipientName: String!, status: DeliveryStatus!, sentAt: String, failedAt: String, errorMessage: String, attemptCount: Int! }
  type Campaign { id: ID!, subject: String!, templateHtml: String, bodyText: String, renderedHtml: String, status: CampaignStatus!, newsArticleId: ID, templateId: ID, sentAt: String, recipientCount: Int!, recipients: [CampaignRecipient!]!, properties: [CampaignProperty!]!, createdAt: String!, completedAt: String, openCount: Int, clickCount: Int, interestCount: Int, saveCount: Int, sentCount: Int, failedCount: Int }
  type CampaignConnection { nodes: [Campaign!]!, totalCount: Int! }
  type CampaignPreview { subject: String!, html: String!, consentedRecipientCount: Int! }

  input TemplateInput {
    name: String!
    subject: String
    htmlContent: String!
    purpose: TemplatePurpose
    propertyIds: [ID!]
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
    campaignId: ID!
    campaignSubject: String!
    date: String!
    sent: Int!
    opens: Int!
    clicks: Int!
    interests: Int!
    saves: Int!
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

  type SubscriberCsvValidation {
    valid: Boolean!
    totalRows: Int!
    validRows: Int!
    invalidRows: Int!
    totalErrors: Int!
    errors: [ImportError!]!
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
    duplicateProperties: [PropertyImportDuplicate!]!
    unresolvedDuplicateCount: Int!
  }

  type PropertyImportDuplicate { rowNumber: Int!, name: String!, existingPropertyId: ID, existingPropertyName: String, source: String!, resolution: String }
  input PropertyImportDuplicateResolutionInput { rowNumber: Int!, action: String! }

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
    createUser(input: CreateUserInput!): User!
    saveTemplate(id: ID, input: TemplateInput!): CampaignTemplate!
    saveCampaign(id: ID, input: CampaignInput!): Campaign!
    sendCampaign(id: ID!): Campaign!
    deleteCampaign(id: ID!): Boolean!
    saveNews(id: ID, input: NewsInput!): NewsArticle!
    publishNews(id: ID!): NewsArticle!
    deleteNews(id: ID!): Boolean!
    recordNewsClick(newsArticleId: ID!): Boolean!
    recordNewsPropertyVisit(newsArticleId: ID!, propertyId: ID!): Boolean!
    uploadPropertyCsv(filename: String!, contentBase64: String!): PropertyUpload!
      uploadSubscriberFile(filename: String!, contentBase64: String!): PropertyUpload!
    validatePropertyCsv(uploadId: ID!): PropertyUpload!
    resolvePropertyImportDuplicates(uploadId: ID!, resolutions: [PropertyImportDuplicateResolutionInput!]!): PropertyUpload!
      validateSubscriberCsv(uploadId: ID!): PropertyUpload!
      startSubscriberImport(uploadId: ID!): PropertyImport!
    cancelPropertyUpload(uploadId: ID!): Boolean!
    startPropertyImport(uploadId: ID!): PropertyImport!
    saveProperty(id: ID, input: HouseTypeInput!): Property!
    publishProperty(id: ID!): Property!
    publishProperties(ids: [ID!]!): Int!
    deleteProperty(id: ID!): Boolean!
    setPropertySaved(propertyId: ID!, saved: Boolean!, campaignToken: String): Boolean!
    recordCampaignSave(propertyId: ID!, campaignToken: String!): Boolean!
    recordPropertyView(propertyId: ID!, campaignToken: String): Boolean!
    recordMortgageCalculation(price: Float!, deposit: Float!, rate: Float!, years: Int!, income: Float!): Boolean!
    submitInterest(input: InterestInput!): Interest!
    addSubscriber(input: SubscriberInput!): Subscriber!
    deleteSubscriber(id: ID!): Boolean!
    deleteSubscribers(ids: [ID!]!): Int!
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
  campaignStats(from: String, to: String): [CampaignDay!]!
  propertyImportUpload(id: ID!): PropertyUpload!
  propertyImportStatus(id: ID!, jobOffset: Int, errorOffset: Int): PropertyImport!
  propertyImportHistory: [PropertyImport!]!
  subscriberImportHistory: [PropertyImport!]!
  me: User!
  savedProperties: [Property!]!
  interestsPage(input: InterestFilter): InterestConnection!
  interestStats(input: InterestFilter): InterestStats!
  interestGroups(input: InterestFilter): [InterestGroup!]!
  agents: [User!]!
  subscribersPage(input: SubscriberFilter): SubscriberConnection!
  exportSubscribers(status: SubscriberStatus): FileDownload!
  subscriberStats(from: String, to: String): SubscriberStats!
  usersPage(input: AdminListInput): UserConnection!
  templatesPage(input: AdminListInput): TemplateConnection!
  templatePreview(id: ID!): HtmlResult!
  campaignsPage(input: CampaignFilter): CampaignConnection!
  campaignDetail(id: ID!, offset: Int, limit: Int): Campaign!
  campaignPreview(id: ID!): CampaignPreview!
  newsPage(input: AdminListInput): NewsConnection!
  publicNewsPage(input: AdminListInput): NewsConnection!
  newsArticle(id: ID!): NewsArticle
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

function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function requireUser(context: { token?: string }) {
  if (!context.token) throw new Error("Authentication required");
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenDigest(context.token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) throw new Error("Authentication required");
  return session.user;
}

async function requireAdmin(context: { token?: string }) {
  const user = await requireUser(context);
  if (user.role !== "ADMIN") throw new Error("Administrator authentication required");
  return user;
}

function uploadResult(upload: { id: string; filename: string; status: string; byteSize: number; expiresAt: Date; validation: unknown }) {
  return {
    ...upload,
    expiresAt: upload.expiresAt.toISOString(),
    validation: upload.validation ?? null,
  };
}

async function assertUniqueSubscriberName(client: { subscriber: { findMany: typeof prisma.subscriber.findMany } }, name: string, email: string, existingId?: string) {
  const normalized = subscriberNameKey(name);
  if (!normalized) throw new Error("Subscriber name is required");
  const subscribers = await client.subscriber.findMany({ select: { id: true, name: true, email: true } });
  const conflict = subscribers.find((subscriber) => subscriberNameKey(subscriber.name) === normalized && subscriber.id !== existingId && subscriber.email.toLowerCase() !== email);
  if (conflict) throw new Error(`Subscriber name already exists: ${conflict.name}`);
}

function assertSubscriberEmailNameCompatible(existing: { name: string } | null, name: string) {
  if (existing && subscriberNameKey(existing.name) !== subscriberNameKey(name)) throw new Error("Subscriber email already exists with a different name");
}

function validateUploadedPropertyCsv(contentBase64: string) {
  const content = Buffer.from(contentBase64, "base64").toString("utf8");
  const headerRows = parse(content, { bom: true, relax_column_count: true, skip_empty_lines: true, to_line: 1 }) as unknown[][];
  const schema = validatePropertyCsvHeaders(headerRows[0] ?? []);
  const rows = parse(content, { bom: true, columns: true, relax_column_count: true, skip_empty_lines: true, trim: false }) as Array<Record<string, unknown>>;
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
    for (const [field, value] of [["Image URL", row["Image URL"]], ["Video URL", row["Video URL"]]] as const) {
      if (value && !/^https?:\/\/\S+$/i.test(String(value).trim())) rowErrors.push({ rowNumber, field, value: String(value), message: `${field} must be a valid http or https URL.`, errorType: "FIELD" });
    }
    if (rowErrors.length) errors.push(...rowErrors);
    else validRows++;
  }

  const allErrors = [
    ...(!schema.valid ? [{ rowNumber: 0, field: "CSV", value: null, message: "CSV headers do not match the required property schema.", errorType: "HEADER" }] : []),
    ...errors,
  ];
  const names = new Map<string, number[]>();
  for (const [index, row] of rows.entries()) {
    const name = String(row.Name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
    if (name) names.set(name, [...(names.get(name) ?? []), index + 2]);
  }
  const fileDuplicates = [...names.entries()].flatMap(([name, rowNumbers]) => rowNumbers.length > 1 ? rowNumbers.map((rowNumber) => ({ rowNumber, name: String(rows[rowNumber - 2].Name).trim(), existingPropertyId: null, existingPropertyName: null, source: "FILE", resolution: null })) : []);
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
    fileDuplicates,
  };
}

async function propertyImportDuplicates(rows: Array<Record<string, unknown>>, fileDuplicates: Array<Record<string, unknown>>) {
  const names = [...new Set(rows.map((row) => String(row.Name ?? "").trim().replace(/\s+/g, " ").toLowerCase()).filter(Boolean))];
  const existing = await prisma.property.findMany({ select: { id: true, name: true } });
  const byName = new Map(existing.map((property) => [property.name.trim().replace(/\s+/g, " ").toLowerCase(), property]));
  return [...fileDuplicates, ...rows.flatMap((row, index) => { const match = byName.get(String(row.Name ?? "").trim().replace(/\s+/g, " ").toLowerCase()); return match ? [{ rowNumber: index + 2, name: String(row.Name).trim(), existingPropertyId: match.id, existingPropertyName: match.name, source: "DATABASE", resolution: null }] : []; })];
}

function validateUploadedSubscriberCsv(contentBase64: string) {
  const content = Buffer.from(contentBase64, "base64").toString("utf8");
  const headers = (parse(content, { bom: true, relax_column_count: true, skip_empty_lines: true, to_line: 1 }) as unknown[][])[0]?.map(String) ?? [];
  const expected = ["Name", "Email", "Phone"];
  const schema = { valid: headers.length === expected.length && expected.every((header, index) => headers[index] === header), expectedColumns: expected, receivedColumns: headers };
  const rows = parse(content, { bom: true, columns: true, relax_column_count: true, skip_empty_lines: true, trim: false }) as Array<Record<string, unknown>>;
  const errors: Array<{ rowNumber: number; field: string; value: string | null; message: string; errorType: string }> = [];
  let validRows = 0;
  for (const [index, row] of rows.entries()) {
    const email = String(row.Email ?? "").trim();
    const name = normalizePersonName(String(row.Name ?? ""));
    const phone = String(row.Phone ?? "").trim();
    const rowErrors = [
      ...(!name ? [{ rowNumber: index + 2, field: "Name", value: null, message: "Name is required.", errorType: "FIELD" }] : []),
      ...(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? [{ rowNumber: index + 2, field: "Email", value: email || null, message: "Email must be valid.", errorType: "FIELD" }] : []),
      ...(phone && !/^\+\d{6,18}$/.test(phone) ? [{ rowNumber: index + 2, field: "Phone", value: phone, message: "Phone must include one country code followed by digits only.", errorType: "FIELD" }] : []),
    ];
    if (rowErrors.length) errors.push(...rowErrors); else validRows++;
  }
  const nameRows = new Map<string, number[]>();
  for (const [index, row] of rows.entries()) {
    const name = subscriberNameKey(String(row.Name ?? ""));
    if (name) nameRows.set(name, [...(nameRows.get(name) ?? []), index + 2]);
  }
  const duplicateNameErrors = [...nameRows.values()].flatMap((rowNumbers) => rowNumbers.length > 1 ? rowNumbers.map((rowNumber) => ({ rowNumber, field: "Name", value: String(rows[rowNumber - 2].Name ?? ""), message: "Subscriber name is duplicated in this CSV.", errorType: "DUPLICATE" })) : []);
  errors.push(...duplicateNameErrors);
  return { valid: schema.valid && errors.length === 0, totalRows: rows.length, validRows: schema.valid ? validRows : 0, invalidRows: schema.valid ? rows.length - validRows : rows.length, totalErrors: errors.length, errors, rows };
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
  const validation = (upload.validation ?? {}) as { duplicateProperties?: Array<{ rowNumber: number; existingPropertyId?: string | null; resolution?: string | null }> };
  const resolutions = new Map((validation.duplicateProperties ?? []).map((duplicate) => [duplicate.rowNumber, duplicate]));
  const job = await prisma.importJob.create({ data: { type: "PROPERTY_IMPORT", status: "PROCESSING", filename: upload.filename, totalRows: rows.length, totalJobs: 1, startedAt: new Date(), createdById: adminId, uploadId } });
  let successfulRows = 0;
  const errors: Array<Record<string, unknown>> = [];
  for (const [index, row] of rows.entries()) {
    try {
      const duplicate = resolutions.get(index + 2);
      if (duplicate?.existingPropertyId && duplicate.resolution === "SKIP") continue;
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
        const data = { name: importText(row.Name), location, address: importText(row.Address), county: importText(row.County), postalCode: importText(row["Postal Code"]), type: importText(row["Property Type"]), saleType: importText(row["Sold times"]), status: importStatusValue(row.Status) as never, stage: importStageValue(row.Stage) as never, priceMin: price, priceMax: price, sizeSqm: size, bedroomsMin: Math.round(beds), bedroomsMax: Math.round(beds), bathroomsMin: Math.round(baths), bathroomsMax: Math.round(baths), completionYear: completionYear === null ? null : Math.round(completionYear), sizeCategory: importText(row["Property Size Category"]) || null, description: importText(row.Description) || null, agentId: agent?.id ?? null, publicationStatus: "DRAFT" as never, publishedAt: null };
        const property = duplicate?.existingPropertyId && duplicate.resolution === "REPLACE" ? await tx.property.update({ where: { id: duplicate.existingPropertyId }, data }) : await tx.property.upsert({ where: { sourceKey: `upload-${uploadId}-row-${index + 2}` }, update: data, create: { sourceKey: `upload-${uploadId}-row-${index + 2}`, ...data } });
        const imageUrl = importText(row["Image URL"]);
        const videoUrl = importText(row["Video URL"]);
        await tx.propertyMedia.deleteMany({ where: { propertyId: property.id, type: { in: ["IMAGE", "VIDEO"] } } });
        if (imageUrl || videoUrl) await tx.propertyMedia.createMany({ data: [
          ...(imageUrl ? [{ propertyId: property.id, url: imageUrl, type: "IMAGE" as const, isPrimary: true, sortOrder: 0 }] : []),
          ...(videoUrl ? [{ propertyId: property.id, url: videoUrl, type: "VIDEO" as const, isPrimary: true, sortOrder: 1 }] : []),
        ] });
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

function serializeNews(article: { id: string; externalUrl: string | null; title: string; summary: string | null; content: string | null; imageUrl: string | null; publicationStatus: string; publishedAt: Date | null; activeFrom: Date | null; activeUntil: Date | null; updatedAt: Date; properties: Array<{ property: unknown }> }) {
  return {
    id: article.id,
    externalUrl: article.externalUrl,
    title: article.title,
    summary: article.summary,
    content: article.content,
    imageUrl: article.imageUrl,
    publicationStatus: article.publicationStatus,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    activeFrom: article.activeFrom?.toISOString() ?? null,
    activeUntil: article.activeUntil?.toISOString() ?? null,
    updatedAt: article.updatedAt.toISOString(),
    properties: article.properties.map((link) => link.property),
    newsClickCount: 0,
    taggedPropertyVisitCount: 0,
  };
}

async function newsAnalyticsCounts(articleIds: string[]) {
  const counts = new Map<string, { newsClickCount: number; taggedPropertyVisitCount: number }>();
  for (const id of articleIds) counts.set(id, { newsClickCount: 0, taggedPropertyVisitCount: 0 });
  if (!articleIds.length) return counts;
  const events = await prisma.analyticsEvent.findMany({
    where: { eventType: { in: ["NEWS_VIEW", "PROPERTY_VIEW"] } },
    select: { eventType: true, propertyId: true, metadata: true },
  });
  for (const event of events) {
    const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata as Record<string, unknown> : null;
    const articleId = typeof metadata?.newsArticleId === "string" ? metadata.newsArticleId : null;
    const count = articleId ? counts.get(articleId) : undefined;
    if (!count) continue;
    if (event.eventType === "NEWS_VIEW") count.newsClickCount += 1;
    if (event.eventType === "PROPERTY_VIEW" && event.propertyId) count.taggedPropertyVisitCount += 1;
  }
  return counts;
}

function serializeNewsWithCounts(article: Parameters<typeof serializeNews>[0], counts?: { newsClickCount: number; taggedPropertyVisitCount: number }) {
  return { ...serializeNews(article), ...counts };
}

function serializeTemplate(template: { id: string; name: string; subject: string | null; htmlContent: string; purpose: string; createdAt: Date; updatedAt: Date; properties: Array<{ propertyId: string }> }) {
  return {
    id: template.id,
    name: template.name,
    subject: template.subject,
    htmlContent: template.htmlContent,
    purpose: template.purpose,
    propertyIds: template.properties.map((property) => property.propertyId),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function renderTemplatePreview(template: { htmlContent: string; properties: Array<{ property: { id: string; name: string; location: string | null; priceMin: unknown; priceMax: unknown; type: string | null; bedroomsMin: number | null; sizeSqm: unknown; media: Array<{ url: string; isPrimary: boolean; type: string }> } }> }, unsubscribeUrl = "#unsubscribe", propertyLinkUrl?: (propertyId: string) => string, linkTracker?: (url: string) => string, openTrackingUrl?: string) {
  const propertyCells = template.properties.map(({ property }) => {
        const image = property.media.find((media) => media.isPrimary && media.type === "IMAGE") ?? property.media.find((media) => media.type === "IMAGE");
        const priceMin = property.priceMin == null ? null : Number(property.priceMin);
        const priceMax = property.priceMax == null ? null : Number(property.priceMax);
        const price = priceMin == null ? "Price on request" : priceMax != null && priceMax !== priceMin ? `€${priceMin.toLocaleString("en-IE")}–€${priceMax.toLocaleString("en-IE")}` : `€${priceMin.toLocaleString("en-IE")}`;
        const propertyUrl = propertyLinkUrl?.(property.id) ?? `${publicAppUrl()}/properties/${encodeURIComponent(property.id)}`;
        return `<td width="50%" valign="top" style="width:50%;padding:8px"><a href="${propertyUrl}" style="text-decoration:none;color:inherit"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ddd5c5;background:#fff"><tr><td>${image ? `<img src="${image.url}" alt="${property.name}" width="100%" style="display:block;width:100%;height:150px;object-fit:cover" />` : `<div style="height:150px;background:#e9e4d8"></div>`}</td></tr><tr><td style="padding:14px"><h3 style="margin:0 0 6px;color:#1b2a4a;font-size:17px;line-height:1.25">${property.name}</h3><p style="margin:0 0 8px;color:#6b7280;font-size:12px">${property.location ?? "Location unavailable"}</p><p style="margin:0 0 8px;color:#e8761b;font-weight:700;font-size:16px">${price}</p><p style="margin:0;color:#6b7280;font-size:12px">${[property.type, property.bedroomsMin != null ? `${property.bedroomsMin} bedrooms` : null, property.sizeSqm != null ? `${Number(property.sizeSqm).toLocaleString("en-IE")} m²` : null].filter(Boolean).join(" · ")}</p></td></tr></table></a></td>`;
      });
  const propertyRows = [];
  for (let index = 0; index < propertyCells.length; index += 2) {
    propertyRows.push(`<tr>${propertyCells[index]}${propertyCells[index + 1] ?? '<td width="50%" style="width:50%;padding:8px"></td>'}</tr>`);
  }
  const propertyCards = propertyCells.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>${propertyRows.join("")}</tbody></table>`
    : "<p>No properties selected for this template.</p>";
  const rendered = template.htmlContent.replace(/\{\{name\}\}/g, "Sample recipient").replace(/\{\{properties\}\}/g, propertyCards);
  const safe = sanitizeHtml(rendered, {
    allowedTags: sanitizeHtml.defaults.allowedTags,
    allowedAttributes: sanitizeHtml.defaults.allowedAttributes,
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => ({ tagName, attribs: { ...attribs, href: attribs.href && /^https?:\/\//i.test(attribs.href) && !attribs.href.includes("/campaign-click?") ? linkTracker?.(attribs.href) ?? attribs.href : attribs.href } }),
    },
  } as unknown as Parameters<typeof sanitizeHtml>[1]);
  const openPixel = openTrackingUrl ? `<img src="${openTrackingUrl}" width="1" height="1" alt="" style="display:none" />` : "";
  return `${safe}<hr style="border:0;border-top:1px solid #ddd5c5;margin:28px 0 16px" /><p style="color:#667085;font-size:12px;text-align:center;margin:0">You are receiving this email because you opted in to Harborstone Homes communications. <a href="${unsubscribeUrl}" style="color:#1b2a4a">Unsubscribe</a></p>${openPixel}`;
}

export const mailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT ?? 587) === 465,
  auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
});

function smtpIsConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function isValidEmailAddress(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function mailFromAddress() {
  const email = process.env.MAIL_FROM_EMAIL?.trim();
  if (!email || !isValidEmailAddress(email)) throw new Error("Email sender is not configured");
  const name = process.env.MAIL_FROM_NAME?.trim() || "Harborstone Homes";
  return `${name} <${email}>`;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return domain ? `${local.slice(0, 1)}***@${domain}` : "***";
}

function containsRecipient(addresses: string[] | undefined, recipientEmail: string) {
  const normalizedRecipient = recipientEmail.trim().toLowerCase();
  return (addresses ?? []).some((address) => address.trim().toLowerCase() === normalizedRecipient);
}

function wasRecipientAccepted(info: { accepted?: string[]; rejected?: string[] }, recipientEmail: string) {
  return containsRecipient(info.accepted, recipientEmail) && !containsRecipient(info.rejected, recipientEmail);
}

function smtpErrorDetails(error: unknown) {
  const candidate = error as { code?: unknown };
  return {
    code: typeof candidate?.code === "string" ? candidate.code : undefined,
    message: error instanceof Error ? error.message : "Email delivery failed",
  };
}

export async function verifyMailTransport() {
  if (!smtpIsConfigured()) {
    console.warn("SMTP verification skipped because SMTP configuration is incomplete");
    return false;
  }
  try {
    await mailTransport.verify();
    console.info("SMTP transport verified", { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587) });
    return true;
  } catch (error) {
    console.error("SMTP transport verification failed", smtpErrorDetails(error));
    return false;
  }
}

function followUpEmailContent(body: string, interest: { name: string; property: { name: string }; agent: { name: string } | null }, unsubscribeLink?: string) {
  const text = body
    .replace(/\{\{name\}\}/g, interest.name)
    .replace(/\{\{property\}\}/g, interest.property.name)
    .replace(/\{\{agent\}\}/g, interest.agent?.name ?? process.env.MAIL_FROM_NAME ?? "Harborstone Homes");
  const footerText = unsubscribeLink ? `\n\nUnsubscribe from future updates: ${unsubscribeLink}` : "";
  const htmlFooter = unsubscribeLink ? `<hr style="border:0;border-top:1px solid #ddd5c5;margin:28px 0 16px" /><p style="color:#667085;font-size:12px;text-align:center;margin:0">You are receiving this email because you registered interest with Harborstone Homes. <a href="${unsubscribeLink}" style="color:#1b2a4a">Unsubscribe from future updates</a></p>` : "";
  return { text: `${text}${footerText}`, html: `<div>${sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).replace(/\n/g, "<br />")}</div>${htmlFooter}` };
}

async function ensureUnsubscribeToken(subscriberId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.unsubscribeToken.create({ data: { tokenHash: tokenDigest(token), subscriberId } });
  return token;
}

async function campaignRecipientForToken(token?: string | null) {
  if (!token) return null;
  return prisma.campaignRecipient.findUnique({ where: { trackingTokenHash: tokenDigest(token) }, select: { id: true, campaignId: true, subscriberId: true, recipientEmail: true } });
}

async function recordCampaignSaveEvent(token: string | null | undefined, propertyId: string) {
  const recipient = await campaignRecipientForToken(token);
  if (!recipient) return false;
  await prisma.campaignEvent.upsert({
    where: { deduplicationKey: `save:${recipient.id}:${propertyId}` },
    create: { campaignId: recipient.campaignId, subscriberId: recipient.subscriberId, recipientId: recipient.id, propertyId, type: "SAVED", deduplicationKey: `save:${recipient.id}:${propertyId}` },
    update: {},
  });
  return true;
}

async function recordCampaignInterestEvent(token: string | null | undefined, propertyId: string, email: string) {
  const recipient = await campaignRecipientForToken(token);
  if (!recipient) return false;
  await prisma.campaignEvent.upsert({
    where: { deduplicationKey: `interest:${recipient.id}:${propertyId}:${email}` },
    create: { campaignId: recipient.campaignId, subscriberId: recipient.subscriberId, recipientId: recipient.id, propertyId, type: "INTEREST", deduplicationKey: `interest:${recipient.id}:${propertyId}:${email}` },
    update: {},
  });
  return true;
}

function serializeCampaign(campaign: { id: string; subject: string; templateHtml: string | null; bodyText: string | null; renderedHtml: string | null; status: string; newsArticleId: string | null; templateId: string | null; sentAt: Date | null; recipientCount: number; createdAt: Date; completedAt: Date | null; properties: Array<{ id: string; propertyId: string | null; propertyName: string }>; recipients: Array<{ id: string; recipientEmail: string; recipientName: string; status: string; sentAt: Date | null; failedAt: Date | null; errorMessage: string | null; attemptCount: number }>; events?: Array<{ type: string }> }) {
  const eventCounts = new Map<string, number>();
  for (const event of campaign.events ?? []) eventCounts.set(event.type, (eventCounts.get(event.type) ?? 0) + 1);
  return { ...campaign, sentAt: campaign.sentAt?.toISOString() ?? null, createdAt: campaign.createdAt.toISOString(), completedAt: campaign.completedAt?.toISOString() ?? null, recipients: campaign.recipients.map((recipient) => ({ ...recipient, sentAt: recipient.sentAt?.toISOString() ?? null, failedAt: recipient.failedAt?.toISOString() ?? null })), openCount: eventCounts.get("OPENED") ?? 0, clickCount: eventCounts.get("CLICKED") ?? 0, interestCount: eventCounts.get("INTEREST") ?? 0, saveCount: eventCounts.get("SAVED") ?? 0, sentCount: campaign.recipients.filter((recipient) => recipient.status === "SENT").length, failedCount: campaign.recipients.filter((recipient) => recipient.status === "FAILED").length };
}

export const root = {
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
  createUser: async ({ input }: { input: { name: string; email: string; password: string; isAdmin: boolean } }, context: { token?: string }) => {
    await requireAdmin(context);
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) throw new Error("Name is required");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email must be valid");
    if (input.password.length < 12 || input.password.length > 128) throw new Error("Password must be 12 to 128 characters");
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: passwordHash(input.password),
        role: input.isAdmin ? "ADMIN" : "USER",
      },
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() };
  },
  saveTemplate: async ({ id, input }: { id?: string; input: { name: string; subject?: string; htmlContent: string; purpose?: "CAMPAIGN" | "INTEREST_FOLLOW_UP"; propertyIds?: string[] } }, context: { token?: string }) => {
    const admin = await requireAdmin(context);
    const name = input.name.trim();
    const htmlContent = input.htmlContent.trim();
    if (!name) throw new Error("Template name is required");
    if (!htmlContent) throw new Error("Template HTML is required");
    const propertyIds = [...new Set(input.propertyIds ?? [])];
    if (propertyIds.length) {
      const publishedProperties = await prisma.property.findMany({ where: { id: { in: propertyIds }, publicationStatus: "PUBLISHED" }, select: { id: true } });
      if (publishedProperties.length !== propertyIds.length) throw new Error("Templates can only be linked to published properties");
    }
    const template = await prisma.$transaction(async (tx) => {
      const saved = id
        ? await tx.campaignTemplate.update({ where: { id }, data: { name, subject: input.subject?.trim() || null, htmlContent, purpose: input.purpose ?? "CAMPAIGN" } })
        : await tx.campaignTemplate.create({ data: { name, subject: input.subject?.trim() || null, htmlContent, purpose: input.purpose ?? "CAMPAIGN", createdById: admin.id } });
      await tx.templateProperty.deleteMany({ where: { templateId: saved.id } });
      if (propertyIds.length) await tx.templateProperty.createMany({ data: propertyIds.map((propertyId) => ({ templateId: saved.id, propertyId })) });
      return tx.campaignTemplate.findUniqueOrThrow({ where: { id: saved.id }, include: { properties: true } });
    });
    return serializeTemplate(template);
  },
  saveCampaign: async ({ id, input }: { id?: string; input: { subject: string; templateHtml?: string; bodyText?: string; templateId?: string | null; propertyIds?: string[]; newsArticleId?: string | null } }, context: { token?: string }) => {
    const admin = await requireAdmin(context);
    const propertyIds = [...new Set(input.propertyIds ?? [])];
    if (propertyIds.length) {
      const count = await prisma.property.count({ where: { id: { in: propertyIds }, publicationStatus: "PUBLISHED" } });
      if (count !== propertyIds.length) throw new Error("Campaigns can only include published properties");
    }
    const campaign = await prisma.$transaction(async (tx) => {
      const saved = id ? await tx.campaign.update({ where: { id }, data: { subject: input.subject.trim(), templateHtml: input.templateHtml ?? null, bodyText: input.bodyText ?? null, templateId: input.templateId ?? null, newsArticleId: input.newsArticleId ?? null } }) : await tx.campaign.create({ data: { subject: input.subject.trim(), templateHtml: input.templateHtml ?? null, bodyText: input.bodyText ?? null, templateId: input.templateId ?? null, newsArticleId: input.newsArticleId ?? null, createdById: admin.id } });
      await tx.campaignProperty.deleteMany({ where: { campaignId: saved.id } });
      if (propertyIds.length) {
        const properties = await tx.property.findMany({ where: { id: { in: propertyIds } }, select: { id: true, name: true } });
        await tx.campaignProperty.createMany({ data: properties.map((property) => ({ campaignId: saved.id, propertyId: property.id, propertyName: property.name })) });
      }
      return tx.campaign.findUniqueOrThrow({ where: { id: saved.id }, include: { properties: true, recipients: true } });
    });
    return serializeCampaign(campaign);
  },
  sendCampaign: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const campaignData = await prisma.campaign.findUniqueOrThrow({ where: { id }, include: { template: true, properties: { include: { property: { include: { media: true } } } } } });
    if (campaignData.status !== "DRAFT") throw new Error("Only draft campaigns can be sent");
    const activeConsentedSubscribers = await prisma.subscriber.findMany({ where: { status: "ACTIVE", consentGrantedAt: { not: null } }, select: { id: true, email: true, name: true } });
    const subscribers = activeConsentedSubscribers.filter((subscriber) => isValidEmailAddress(subscriber.email));
    console.info("Campaign eligible recipients", { campaignId: id, eligibleRecipients: subscribers.length, excludedInvalidAddresses: activeConsentedSubscribers.length - subscribers.length });
    if (!subscribers.length) {
      const completed = await prisma.campaign.update({ where: { id }, data: { status: "FAILED", recipientCount: 0, startedAt: new Date(), sentAt: null, completedAt: new Date() }, include: { properties: true, recipients: true, events: { select: { type: true } } } });
      return serializeCampaign(completed);
    }
    if (!smtpIsConfigured()) throw new Error("Email service is not configured");
    const from = mailFromAddress();
    await prisma.$transaction(async (tx) => {
      await tx.campaignRecipient.deleteMany({ where: { campaignId: id, status: "PENDING" } });
      if (subscribers.length) await tx.campaignRecipient.createMany({ data: subscribers.map((subscriber) => ({ campaignId: id, subscriberId: subscriber.id, recipientEmail: subscriber.email, recipientName: subscriber.name })) });
      return tx.campaign.update({ where: { id }, data: { status: "QUEUED", startedAt: new Date(), recipientCount: subscribers.length }, include: { properties: true, recipients: true } });
    });
    let sent = 0;
    for (const recipient of subscribers) {
      const row = await prisma.campaignRecipient.findUniqueOrThrow({ where: { campaignId_subscriberId: { campaignId: id, subscriberId: recipient.id } } });
      const attemptNumber = row.attemptCount + 1;
      await prisma.campaignRecipient.update({ where: { id: row.id }, data: { status: "SENDING", attemptCount: attemptNumber } });
      const attempt = await prisma.deliveryAttempt.create({ data: { recipientId: row.id, attemptNumber, status: "SENDING" } });
      try {
        const rawToken = randomBytes(32).toString("hex");
        await prisma.campaignRecipient.update({ where: { id: row.id }, data: { trackingTokenHash: tokenDigest(rawToken) } });
        const unsubscribeToken = await ensureUnsubscribeToken(recipient.id);
        const html = renderTemplatePreview({ htmlContent: campaignData.template?.htmlContent ?? campaignData.templateHtml ?? "", properties: campaignData.properties.filter((link) => link.property).map((link) => ({ property: link.property! })) }, unsubscribeUrl(unsubscribeToken, rawToken), (propertyId) => campaignClickUrl(rawToken, "", propertyId), (destination) => campaignClickUrl(rawToken, destination), campaignOpenUrl(rawToken));
        const info = await mailTransport.sendMail({ from, to: recipient.email, subject: campaignData.subject, html });
        console.info("Campaign SMTP result", { campaignId: id, recipientId: row.id, recipient: maskEmail(recipient.email), acceptedCount: info.accepted?.length ?? 0, rejectedCount: info.rejected?.length ?? 0, messageId: info.messageId, response: info.response });
        if (!wasRecipientAccepted(info, recipient.email)) throw new Error(info.rejected?.length ? "Mail server rejected the recipient" : "Mail server did not confirm recipient acceptance");
        await prisma.$transaction([
          prisma.campaignRecipient.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), providerMessageId: info.messageId } }),
          prisma.deliveryAttempt.update({ where: { id: attempt.id }, data: { status: "SENT", providerMessageId: info.messageId, finishedAt: new Date() } }),
          prisma.campaignEvent.create({ data: { campaignId: id, subscriberId: recipient.id, recipientId: row.id, type: "SENT" } }),
        ]);
        sent++;
      } catch (error) {
        const { code, message } = smtpErrorDetails(error);
        console.error("Campaign SMTP delivery failed", { campaignId: id, recipientId: row.id, recipient: maskEmail(recipient.email), code, message });
        await prisma.$transaction([
          prisma.campaignRecipient.update({ where: { id: row.id }, data: { status: "FAILED", failedAt: new Date(), errorMessage: message } }),
          prisma.deliveryAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", errorMessage: message, finishedAt: new Date() } }),
          prisma.campaignEvent.create({ data: { campaignId: id, subscriberId: recipient.id, recipientId: row.id, type: "FAILED" } }),
        ]);
      }
    }
    const finalStatus = sent === subscribers.length ? "SENT" : sent ? "PARTIALLY_FAILED" : "FAILED";
    const completed = await prisma.campaign.update({ where: { id }, data: { status: finalStatus, sentAt: sent ? new Date() : null, completedAt: new Date() }, include: { properties: true, recipients: true, events: { select: { type: true } } } });
    return serializeCampaign(completed);
  },
  deleteCampaign: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    await prisma.campaign.delete({ where: { id } });
    return true;
  },
  saveNews: async ({ id, input }: { id?: string; input: { externalUrl?: string; title: string; summary?: string; content?: string; imageUrl?: string; activeFrom?: string | null; activeUntil?: string | null; propertyIds?: string[] } }, context: { token?: string }) => {
    const admin = await requireAdmin(context);
    const title = input.title.trim();
    if (!title) throw new Error("Headline is required");
    const externalUrl = input.externalUrl?.trim() || null;
    if (externalUrl) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(externalUrl);
      } catch {
        throw new Error("External article URL must be a valid URL");
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new Error("External article URL must use http or https");
    }
    const data = {
      externalUrl,
      title,
      summary: input.summary?.trim() || null,
      content: input.content?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      activeFrom: input.activeFrom ? new Date(`${input.activeFrom}T00:00:00.000Z`) : null,
      activeUntil: input.activeUntil ? new Date(`${input.activeUntil}T23:59:59.999Z`) : null,
      ...(id ? {} : { createdById: admin.id }),
    };
    const propertyIds = [...new Set(input.propertyIds ?? [])];
    if (propertyIds.length) {
      const publishedProperties = await prisma.property.findMany({ where: { id: { in: propertyIds }, publicationStatus: "PUBLISHED" }, select: { id: true } });
      if (publishedProperties.length !== propertyIds.length) throw new Error("News can only be linked to published properties");
    }
    const article = await prisma.$transaction(async (tx) => {
      const saved = id
        ? await tx.newsArticle.update({ where: { id }, data })
        : await tx.newsArticle.create({ data });
      await tx.newsProperty.deleteMany({ where: { newsArticleId: saved.id } });
      if (propertyIds.length) {
        await tx.newsProperty.createMany({ data: propertyIds.map((propertyId) => ({ newsArticleId: saved.id, propertyId })) });
      }
      return tx.newsArticle.findUniqueOrThrow({ where: { id: saved.id }, include: { properties: { include: { property: true } } } });
    });
    return serializeNews(article);
  },
  publishNews: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const article = await prisma.newsArticle.update({ where: { id }, data: { publicationStatus: "PUBLISHED", publishedAt: new Date() }, include: { properties: { include: { property: true } } } });
    return serializeNews(article);
  },
  deleteNews: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    await prisma.newsArticle.delete({ where: { id } });
    return true;
  },
  recordNewsClick: async ({ newsArticleId }: { newsArticleId: string }) => {
    await prisma.analyticsEvent.create({ data: { eventType: "NEWS_VIEW", metadata: { newsArticleId } } });
    return true;
  },
  recordNewsPropertyVisit: async ({ newsArticleId, propertyId }: { newsArticleId: string; propertyId: string }) => {
    await prisma.analyticsEvent.create({ data: { eventType: "PROPERTY_VIEW", propertyId, metadata: { newsArticleId } } });
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
  publishProperties: async ({ ids }: { ids: string[] }, context: { token?: string }) => {
    await requireAdmin(context);
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return 0;
    const result = await prisma.property.updateMany({ where: { id: { in: uniqueIds }, publicationStatus: "DRAFT" }, data: { publicationStatus: "PUBLISHED", publishedAt: new Date() } });
    return result.count;
  },
  deleteProperty: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    await prisma.property.delete({ where: { id } });
    return true;
  },
  me: async (_args: unknown, context: { token?: string }) => {
    const user = await requireUser(context);
    return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() };
  },
  savedProperties: async (_args: unknown, context: { token?: string }) => {
    const user = await requireUser(context);
    const records = await prisma.savedProperty.findMany({ where: { userId: user.id }, include: { property: { include: { agent: true, media: true, features: { include: { feature: true } }, valueHistory: { orderBy: { year: "asc" } } } } }, orderBy: { createdAt: "desc" } });
    return records.map((record) => serializeProperty(record.property));
  },
  setPropertySaved: async ({ propertyId, saved, campaignToken }: { propertyId: string; saved: boolean; campaignToken?: string }, context: { token?: string }) => {
    const user = await requireUser(context);
    const existing = await prisma.savedProperty.findUnique({ where: { userId_propertyId: { userId: user.id, propertyId } }, select: { id: true } });
    if (saved) await prisma.savedProperty.upsert({ where: { userId_propertyId: { userId: user.id, propertyId } }, create: { userId: user.id, propertyId }, update: {} });
    else await prisma.savedProperty.deleteMany({ where: { userId: user.id, propertyId } });
    if (saved && !existing) await recordCampaignSaveEvent(campaignToken, propertyId).catch((error) => console.error("Campaign save attribution failed", error));
    return saved;
  },
  recordCampaignSave: async ({ propertyId, campaignToken }: { propertyId: string; campaignToken: string }) => {
    return recordCampaignSaveEvent(campaignToken, propertyId);
  },
  recordPropertyView: async ({ propertyId }: { propertyId: string }) => {
    await prisma.analyticsEvent.create({ data: { propertyId, eventType: "PROPERTY_VIEW" } });
    return true;
  },
  recordMortgageCalculation: async ({ price, deposit, rate, years, income }: { price: number; deposit: number; rate: number; years: number; income: number }) => {
    if (![price, deposit, rate, years, income].every(Number.isFinite) || price <= 0 || deposit < 0 || deposit > price || rate < 0 || rate > 100 || years <= 0 || years > 50 || income <= 0) {
      throw new Error("Mortgage calculation inputs are invalid");
    }
    await prisma.analyticsEvent.create({ data: { eventType: "MORTGAGE_CALCULATED", metadata: { price, deposit, rate, years, income } } });
    return true;
  },
  submitInterest: async ({ input }: { input: { propertyId: string; name: string; email: string; phone?: string; message: string; consent: boolean; campaignToken?: string } }, context: { token?: string }) => {
    if (!input.consent) throw new Error("Consent is required to submit interest");
    const property = await prisma.property.findFirst({ where: { id: input.propertyId, publicationStatus: "PUBLISHED" }, select: { id: true, name: true, location: true, status: true, agentId: true } });
    if (!property) throw new Error("Property is not available");
    const name = normalizePersonName(input.name);
    const email = input.email.trim().toLowerCase();
    const phone = normalizePhone(input.phone, true);
    const message = input.message.trim();
    if (!name) throw new Error("Name is required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Email must be valid");
    if (!message) throw new Error("Message is required");
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const existingByEmail = await tx.subscriber.findUnique({ where: { email }, select: { id: true, name: true } });
      assertSubscriberEmailNameCompatible(existingByEmail, name);
      await assertUniqueSubscriberName(tx, name, email, existingByEmail?.id);
      const subscriber = await tx.subscriber.upsert({
        where: { email },
        create: { name, email, phone, status: "ACTIVE", subscribedAt: now, consentGrantedAt: now, consentVersion: "interest-v1" },
        update: { name, phone, status: "ACTIVE", subscribedAt: now, consentGrantedAt: now, consentVersion: "interest-v1", unsubscribedAt: null },
      });
      await tx.consent.create({ data: { subscriberId: subscriber.id, type: "INTEREST", granted: true, version: "interest-v1", source: "property-interest" } });
      const interest = await tx.interest.create({ data: { propertyId: property.id, userId: null, agentId: property.agentId, name, email, phone, message, dataConsent: true } });
      return interest;
    });
    await recordCampaignInterestEvent(input.campaignToken, property.id, email).catch((error) => console.error("Campaign interest attribution failed", error));
    return { ...result, createdAt: result.createdAt.toISOString(), property };
  },
  addSubscriber: async ({ input }: { input: { name: string; email: string; phone?: string; consent: boolean } }, context: { token?: string }) => {
    await requireAdmin(context);
    if (!input.consent) throw new Error("Explicit marketing consent is required");
    const name = normalizePersonName(input.name);
    const email = input.email.trim().toLowerCase();
    const phone = normalizePhone(input.phone, false);
    if (!name) throw new Error("Subscriber name is required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Email must be valid");
    const now = new Date();
    const subscriber = await prisma.$transaction(async (tx) => {
      const existingByEmail = await tx.subscriber.findUnique({ where: { email }, select: { id: true, name: true } });
      assertSubscriberEmailNameCompatible(existingByEmail, name);
      await assertUniqueSubscriberName(tx, name, email, existingByEmail?.id);
      return tx.subscriber.upsert({
        where: { email },
        create: { name, email, phone, status: "ACTIVE", subscribedAt: now, consentGrantedAt: now, consentVersion: "marketing-v1" },
        update: { name, phone, status: "ACTIVE", subscribedAt: now, unsubscribedAt: null, consentGrantedAt: now, consentVersion: "marketing-v1" },
      });
    });
    await prisma.consent.create({ data: { subscriberId: subscriber.id, type: "MARKETING", granted: true, version: "marketing-v1", source: "admin-registration" } });
    return { ...subscriber, consentGrantedAt: subscriber.consentGrantedAt?.toISOString() ?? null, subscribedAt: subscriber.subscribedAt?.toISOString() ?? null, unsubscribedAt: null };
  },
  deleteSubscriber: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    await prisma.$transaction(async (tx) => {
      await tx.consent.deleteMany({ where: { subscriberId: id } });
      await tx.unsubscribeToken.deleteMany({ where: { subscriberId: id } });
      await tx.subscriber.delete({ where: { id } });
    });
    return true;
  },
  deleteSubscribers: async ({ ids }: { ids: string[] }, context: { token?: string }) => {
    await requireAdmin(context);
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return 0;
    await prisma.$transaction(async (tx) => {
      await tx.consent.deleteMany({ where: { subscriberId: { in: uniqueIds } } });
      await tx.unsubscribeToken.deleteMany({ where: { subscriberId: { in: uniqueIds } } });
      await tx.subscriber.deleteMany({ where: { id: { in: uniqueIds } } });
    });
    return uniqueIds.length;
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
    const current = await prisma.interestFollowUp.findUniqueOrThrow({ where: { id }, include: { interest: { include: { property: true, agent: true } } } });
    if (current.status !== "PENDING") throw new Error("Only unsent follow-up drafts can be sent");
    const now = new Date();
    const followUp = await prisma.interestFollowUp.update({ where: { id }, data: { status: "SENDING", sendRequestedAt: now, sentById: admin.id, attemptCount: { increment: 1 }, errorMessage: null, failedAt: null } });
    try {
      if (!smtpIsConfigured()) throw new Error("Email service is not configured");
      const from = mailFromAddress();
      const subscriber = await prisma.subscriber.findUnique({ where: { email: current.interest.email.toLowerCase() }, select: { id: true } });
      const unsubscribeLink = subscriber ? unsubscribeUrl(await ensureUnsubscribeToken(subscriber.id)) : undefined;
      const content = followUpEmailContent(current.body, current.interest, unsubscribeLink);
      const info = await mailTransport.sendMail({ from, to: current.interest.email, subject: current.subject, html: content.html });
      console.info("Interest follow-up SMTP result", { followUpId: id, recipient: maskEmail(current.interest.email), acceptedCount: info.accepted?.length ?? 0, rejectedCount: info.rejected?.length ?? 0, messageId: info.messageId, response: info.response });
      if (!wasRecipientAccepted(info, current.interest.email)) throw new Error(info.rejected?.length ? "Mail server rejected the recipient" : "Mail server did not confirm recipient acceptance");
      const sent = await prisma.$transaction(async (tx) => {
        const saved = await tx.interestFollowUp.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), providerMessageId: info.messageId } });
        await tx.interest.update({ where: { id: current.interestId }, data: { followUpSent: true } });
        return saved;
      });
      return { ...sent, createdAt: sent.createdAt.toISOString(), sendRequestedAt: sent.sendRequestedAt?.toISOString() ?? null, sentAt: sent.sentAt?.toISOString() ?? null, failedAt: sent.failedAt?.toISOString() ?? null };
    } catch (error) {
      const { code, message } = smtpErrorDetails(error);
      console.error("Interest follow-up SMTP delivery failed", { followUpId: id, recipient: maskEmail(current.interest.email), code, message });
      const failed = await prisma.interestFollowUp.update({ where: { id }, data: { status: "FAILED", failedAt: new Date(), errorMessage: message } });
      return { ...failed, createdAt: failed.createdAt.toISOString(), sendRequestedAt: failed.sendRequestedAt?.toISOString() ?? null, sentAt: failed.sentAt?.toISOString() ?? null, failedAt: failed.failedAt?.toISOString() ?? null };
    }
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
    const activityDates = rows.flatMap((row) => [row.createdAt, ...row.followUps.map((followUp) => followUp.sentAt ?? followUp.sendRequestedAt).filter((date): date is Date => Boolean(date))]);
    const firstActivity = activityDates[0];
    const lastActivity = activityDates.reduce((latest, date) => date > latest ? date : latest, firstActivity ?? new Date());
    const start = input?.from ? new Date(`${input.from}T00:00:00.000Z`) : new Date((firstActivity ?? new Date()).toISOString().slice(0, 10) + "T00:00:00.000Z");
    const end = input?.to ? new Date(`${input.to}T00:00:00.000Z`) : new Date(lastActivity.toISOString().slice(0, 10) + "T00:00:00.000Z");
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
  subscribersPage: async ({ input }: { input?: { search?: string; status?: string; offset?: number; limit?: number } }, context: { token?: string }) => {
    await requireAdmin(context);
    const where = {
      ...(input?.status && input.status !== "ALL" ? { status: input.status as "PENDING" | "ACTIVE" | "UNSUBSCRIBED" } : {}),
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
  exportSubscribers: async ({ status }: { status?: "PENDING" | "ACTIVE" | "UNSUBSCRIBED" }, context: { token?: string }) => {
    await requireAdmin(context);
    const subscribers = await prisma.subscriber.findMany({ where: status ? { status } : undefined, orderBy: { createdAt: "asc" } });
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      ["Name", "Email", "Phone", "Status", "Subscribed At", "Unsubscribed At"].join(","),
      ...subscribers.map((subscriber) => [subscriber.name, subscriber.email, subscriber.phone, subscriber.status, subscriber.subscribedAt?.toISOString(), subscriber.unsubscribedAt?.toISOString()].map(escape).join(",")),
    ].join("\r\n");
    return { filename: `subscribers-${status?.toLowerCase() ?? "all"}.csv`, mimeType: "text/csv;charset=utf-8", contentBase64: Buffer.from(csv, "utf8").toString("base64") };
  },
  subscriberStats: async ({ from, to }: { from?: string; to?: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const rows = await prisma.subscriber.findMany({ select: { subscribedAt: true, unsubscribedAt: true } });
    return calculateSubscriberStats(rows, from, to);
  },
  usersPage: async ({ input }: { input?: { search?: string; offset?: number; limit?: number } }, context: { token?: string }) => {
    await requireAdmin(context);
    const search = input?.search?.trim();
    const where = search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } : undefined;
    const [nodes, totalCount] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: Math.max(input?.offset ?? 0, 0), take: Math.min(Math.max(input?.limit ?? 20, 1), 100) }),
      prisma.user.count({ where }),
    ]);
    return { nodes: nodes.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() })), totalCount };
  },
  templatesPage: async ({ input }: { input?: { search?: string; offset?: number; limit?: number } }, context: { token?: string }) => {
    await requireAdmin(context);
    const search = input?.search?.trim();
    const where = search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { subject: { contains: search, mode: "insensitive" as const } }] } : undefined;
    const [nodes, totalCount] = await Promise.all([
      prisma.campaignTemplate.findMany({ where, orderBy: { updatedAt: "desc" }, skip: Math.max(input?.offset ?? 0, 0), take: Math.min(Math.max(input?.limit ?? 20, 1), 100), include: { properties: true } }),
      prisma.campaignTemplate.count({ where }),
    ]);
    return { nodes: nodes.map(serializeTemplate), totalCount };
  },
  campaignsPage: async ({ input }: { input?: { search?: string; from?: string; to?: string; status?: string; offset?: number; limit?: number } }, context: { token?: string }) => {
    await requireAdmin(context);
    const where = { ...(input?.search ? { subject: { contains: input.search, mode: "insensitive" as const } } : {}), ...(input?.status ? { status: input.status as never } : {}), ...(input?.from || input?.to ? { createdAt: { ...(input.from ? { gte: new Date(input.from) } : {}), ...(input.to ? { lte: new Date(`${input.to}T23:59:59.999Z`) } : {}) } } : {}) };
    const [nodes, totalCount] = await Promise.all([
      prisma.campaign.findMany({ where, orderBy: { createdAt: "desc" }, skip: Math.max(input?.offset ?? 0, 0), take: Math.min(Math.max(input?.limit ?? 20, 1), 100), include: { properties: true, recipients: true, events: { select: { type: true } } } }),
      prisma.campaign.count({ where }),
    ]);
    return { nodes: nodes.map(serializeCampaign), totalCount };
  },
  campaignDetail: async ({ id, offset = 0, limit = 50 }: { id: string; offset?: number; limit?: number }, context: { token?: string }) => {
    await requireAdmin(context);
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id }, include: { properties: true, recipients: { skip: offset, take: limit, orderBy: { createdAt: "asc" } }, events: { select: { type: true } } } });
    return serializeCampaign(campaign);
  },
  campaignPreview: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const [campaign, consentedRecipientCount] = await Promise.all([
      prisma.campaign.findUniqueOrThrow({ where: { id }, include: { template: true, properties: { include: { property: { include: { media: true } } } } } }),
      prisma.subscriber.count({ where: { status: "ACTIVE", consentGrantedAt: { not: null } } }),
    ]);
    const html = campaign.template?.htmlContent ?? campaign.templateHtml ?? "";
    const preview = renderTemplatePreview({ htmlContent: html, properties: campaign.properties.map((link) => ({ property: link.property! })) });
    return { subject: campaign.subject, html: preview, consentedRecipientCount };
  },
  templatePreview: async ({ id }: { id: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const template = await prisma.campaignTemplate.findUniqueOrThrow({ where: { id }, include: { properties: { include: { property: { include: { media: true } } } } } });
    return { html: renderTemplatePreview(template) };
  },
  newsPage: async ({ input }: { input?: { search?: string; offset?: number; limit?: number } }, context: { token?: string }) => {
    await requireAdmin(context);
    const search = input?.search?.trim();
    const where = search ? { OR: [{ title: { contains: search, mode: "insensitive" as const } }, { summary: { contains: search, mode: "insensitive" as const } }] } : undefined;
    const [nodes, totalCount] = await Promise.all([
      prisma.newsArticle.findMany({ where, orderBy: { updatedAt: "desc" }, skip: Math.max(input?.offset ?? 0, 0), take: Math.min(Math.max(input?.limit ?? 20, 1), 100), include: { properties: { include: { property: true } } } }),
      prisma.newsArticle.count({ where }),
    ]);
    const counts = await newsAnalyticsCounts(nodes.map((article) => article.id));
    return { nodes: nodes.map((article) => serializeNewsWithCounts(article, counts.get(article.id))), totalCount };
  },
  publicNewsPage: async ({ input }: { input?: { search?: string; offset?: number; limit?: number } }) => {
    const now = new Date();
    const search = input?.search?.trim();
    const where = {
      publicationStatus: "PUBLISHED" as const,
      activeFrom: { lte: now },
      OR: [{ activeUntil: null }, { activeUntil: { gte: now } }],
      ...(search ? { AND: [{ OR: [{ title: { contains: search, mode: "insensitive" as const } }, { summary: { contains: search, mode: "insensitive" as const } }] }] } : {}),
    };
    const [nodes, totalCount] = await Promise.all([
      prisma.newsArticle.findMany({ where, orderBy: { publishedAt: "desc" }, skip: Math.max(input?.offset ?? 0, 0), take: Math.min(Math.max(input?.limit ?? 20, 1), 100), include: { properties: { include: { property: true } } } }),
      prisma.newsArticle.count({ where }),
    ]);
    return { nodes: nodes.map(serializeNews), totalCount };
  },
  newsArticle: async ({ id }: { id: string }) => {
    const now = new Date();
    const article = await prisma.newsArticle.findFirst({ where: { id, publicationStatus: "PUBLISHED", activeFrom: { lte: now }, OR: [{ activeUntil: null }, { activeUntil: { gte: now } }] }, include: { properties: { include: { property: true } } } });
    return article ? serializeNews(article) : null;
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
  uploadSubscriberFile: async ({ filename, contentBase64 }: { filename: string; contentBase64: string }, context: { token?: string }) => {
    const admin = await requireAdmin(context);
    if (!/\.csv$/i.test(filename)) throw new Error("Only CSV subscriber files are supported");
    const upload = await prisma.propertyImportUpload.create({ data: { filename, type: "SUBSCRIBER_IMPORT", byteSize: Buffer.byteLength(contentBase64, "base64"), content: contentBase64, createdById: admin.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    return uploadResult(upload);
  },
  validatePropertyCsv: async ({ uploadId }: { uploadId: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const upload = await prisma.propertyImportUpload.findUniqueOrThrow({ where: { id: uploadId } });
    const invalidSchema = { valid: false, expectedColumns: [...PROPERTY_CSV_COLUMNS], requiredColumns: [...PROPERTY_CSV_COLUMNS.slice(0, 16)], receivedColumns: [], missingColumns: [...PROPERTY_CSV_COLUMNS.slice(0, 16)], unknownColumns: [], duplicateColumns: [], emptyColumns: [] };
    if (!upload.content) {
      const validation = { valid: false, totalRows: 0, validRows: 0, invalidRows: 0, totalErrors: 1, errorsTruncated: false, schema: invalidSchema, errors: [{ rowNumber: 0, field: "CSV", value: null, message: "The uploaded file content is unavailable. Upload the file again.", errorType: "UPLOAD" }], duplicateProperties: [], unresolvedDuplicateCount: 0 };
      return uploadResult(await prisma.propertyImportUpload.update({ where: { id: uploadId }, data: { status: "INVALID", validation: validation as unknown as import("./generated/client.js").Prisma.InputJsonValue } }));
    }
    let result: ReturnType<typeof validateUploadedPropertyCsv>;
    try { result = validateUploadedPropertyCsv(upload.content); }
    catch (error) {
      const validation = { valid: false, totalRows: 0, validRows: 0, invalidRows: 0, totalErrors: 1, errorsTruncated: false, schema: invalidSchema, errors: [{ rowNumber: 0, field: "CSV", value: null, message: error instanceof Error ? `The CSV could not be read: ${error.message}` : "The CSV could not be read. Upload a valid UTF-8 CSV file.", errorType: "FORMAT" }], duplicateProperties: [], unresolvedDuplicateCount: 0 };
      return uploadResult(await prisma.propertyImportUpload.update({ where: { id: uploadId }, data: { status: "INVALID", validation: validation as unknown as import("./generated/client.js").Prisma.InputJsonValue } }));
    }
    const duplicateProperties = await propertyImportDuplicates(result.rows, result.fileDuplicates);
    const validation = { valid: result.valid && !result.fileDuplicates.length, totalRows: result.totalRows, validRows: result.validRows, invalidRows: result.invalidRows, totalErrors: result.totalErrors, errorsTruncated: result.errorsTruncated, schema: result.schema, errors: result.errors, duplicateProperties, unresolvedDuplicateCount: duplicateProperties.length };
    const updated = await prisma.propertyImportUpload.update({ where: { id: uploadId }, data: { status: result.valid ? "READY" : "INVALID", validation: validation as unknown as import("./generated/client.js").Prisma.InputJsonValue, validatedRows: result.rows as unknown as import("./generated/client.js").Prisma.InputJsonValue } });
    return uploadResult(updated);
  },
  resolvePropertyImportDuplicates: async ({ uploadId, resolutions }: { uploadId: string; resolutions: Array<{ rowNumber: number; action: string }> }, context: { token?: string }) => {
    await requireAdmin(context);
    const upload = await prisma.propertyImportUpload.findUniqueOrThrow({ where: { id: uploadId } });
    const validation = (upload.validation ?? {}) as { valid?: boolean; duplicateProperties?: Array<{ rowNumber: number; source: string; existingPropertyId?: string | null }> };
    const choices = new Map(resolutions.map((resolution) => [resolution.rowNumber, resolution.action]));
    const duplicateProperties = (validation.duplicateProperties ?? []).map((duplicate) => ({ ...duplicate, resolution: choices.get(duplicate.rowNumber) ?? null }));
    if (duplicateProperties.some((duplicate) => duplicate.source === "FILE" || !["SKIP", "REPLACE"].includes(duplicate.resolution ?? ""))) throw new Error("Resolve every database duplicate and remove duplicate names within the CSV before importing");
    const updated = await prisma.propertyImportUpload.update({ where: { id: uploadId }, data: { validation: { ...validation, duplicateProperties, unresolvedDuplicateCount: 0 } as never } });
    return uploadResult(updated);
  },
  validateSubscriberCsv: async ({ uploadId }: { uploadId: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const upload = await prisma.propertyImportUpload.findUniqueOrThrow({ where: { id: uploadId } });
    if (!upload.content) throw new Error("Uploaded subscriber CSV content is unavailable");
    const result = validateUploadedSubscriberCsv(upload.content);
    const subscribers = await prisma.subscriber.findMany({ select: { name: true, email: true } });
    const existingByName = new Map(subscribers.map((subscriber) => [subscriberNameKey(subscriber.name), subscriber]));
    const duplicateNameErrors = result.rows.flatMap((row, index) => {
      const name = normalizePersonName(String(row.Name ?? ""));
      const email = String(row.Email ?? "").trim().toLowerCase();
      const match = existingByName.get(subscriberNameKey(name));
      return match && match.email.toLowerCase() !== email ? [{ rowNumber: index + 2, field: "Name", value: name, message: `Subscriber name already exists: ${match.name}`, errorType: "DUPLICATE" }] : [];
    });
    const existingByEmail = new Map(subscribers.map((subscriber) => [subscriber.email.toLowerCase(), subscriber]));
    const emailNameErrors = result.rows.flatMap((row, index) => {
      const name = normalizePersonName(String(row.Name ?? ""));
      const email = String(row.Email ?? "").trim().toLowerCase();
      const match = existingByEmail.get(email);
      return match && subscriberNameKey(match.name) !== subscriberNameKey(name) ? [{ rowNumber: index + 2, field: "Email", value: email, message: "Subscriber email already exists with a different name", errorType: "DUPLICATE" }] : [];
    });
    const errors = [...result.errors, ...duplicateNameErrors, ...emailNameErrors];
    const valid = result.valid && errors.length === 0;
    const validation = { valid, totalRows: result.totalRows, validRows: valid ? result.validRows : Math.max(result.validRows - duplicateNameErrors.length, 0), invalidRows: valid ? result.invalidRows : result.totalRows - Math.max(result.validRows - duplicateNameErrors.length, 0), totalErrors: errors.length, errorsTruncated: false, schema: { valid: result.valid, expectedColumns: ["Name", "Email", "Phone"], requiredColumns: ["Name", "Email"], receivedColumns: ["Name", "Email", "Phone"], missingColumns: [], unknownColumns: [], duplicateColumns: [], emptyColumns: [] }, errors };
    const updated = await prisma.propertyImportUpload.update({ where: { id: uploadId }, data: { status: valid ? "READY" : "INVALID", validation, validatedRows: result.rows as unknown as import("./generated/client.js").Prisma.InputJsonValue } });
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
    const validation = (upload.validation ?? {}) as { unresolvedDuplicateCount?: number };
    if (validation.unresolvedDuplicateCount) throw new Error("Resolve duplicate properties before importing");
    return importPropertiesFromUpload(uploadId, admin.id);
  },
  startSubscriberImport: async ({ uploadId }: { uploadId: string }, context: { token?: string }) => {
    const admin = await requireAdmin(context);
    const upload = await prisma.propertyImportUpload.findUniqueOrThrow({ where: { id: uploadId } });
    if (upload.status !== "READY") throw new Error("Subscriber upload must pass validation before import");
    const rows = Array.isArray(upload.validatedRows) ? upload.validatedRows as Array<Record<string, unknown>> : [];
    const job = await prisma.importJob.create({ data: { type: "SUBSCRIBER_IMPORT", status: "PROCESSING", filename: upload.filename, totalRows: rows.length, totalJobs: 1, startedAt: new Date(), createdById: admin.id, uploadId } });
    let successfulRows = 0;
    const errors: Array<Record<string, unknown>> = [];
    for (const [index, row] of rows.entries()) {
      try {
        const now = new Date();
        const email = String(row.Email).trim().toLowerCase();
        const name = normalizePersonName(String(row.Name ?? ""));
        const phone = normalizePhone(String(row.Phone ?? "").trim() || null, false);
        const subscriber = await prisma.$transaction(async (tx) => {
          const existingByEmail = await tx.subscriber.findUnique({ where: { email }, select: { id: true, name: true } });
          assertSubscriberEmailNameCompatible(existingByEmail, name);
          await assertUniqueSubscriberName(tx, name, email, existingByEmail?.id);
          return tx.subscriber.upsert({ where: { email }, create: { name, email, phone, status: "ACTIVE", subscribedAt: now, consentGrantedAt: now, consentVersion: "marketing-v1" }, update: { name, phone, status: "ACTIVE", subscribedAt: now, unsubscribedAt: null, consentGrantedAt: now, consentVersion: "marketing-v1" } });
        });
        await prisma.consent.create({ data: { subscriberId: subscriber.id, type: "MARKETING", granted: true, version: "marketing-v1", source: "subscriber-import" } });
        successfulRows++;
      } catch (error) { errors.push({ rowNumber: index + 2, field: "row", value: null, message: error instanceof Error ? error.message : "Import failed", errorType: "IMPORT" }); }
    }
    await prisma.importJob.update({ where: { id: job.id }, data: { status: errors.length ? successfulRows ? "PARTIALLY_COMPLETED" : "FAILED" : "COMPLETED", successfulRows, failedRows: errors.length, completedJobs: 1, completedAt: new Date(), errors: errors as unknown as import("./generated/client.js").Prisma.InputJsonValue } });
    await prisma.propertyImportUpload.update({ where: { id: uploadId }, data: { status: "CONSUMED" } });
    const completed = await prisma.importJob.findUniqueOrThrow({ where: { id: job.id }, include: { createdBy: true } });
    return importStatus(completed);
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
  campaignStats: async ({ from, to }: { from?: string; to?: string }, context: { token?: string }) => {
    await requireAdmin(context);
    const start = from ? new Date(`${from}T00:00:00.000Z`) : null;
    const end = to ? new Date(`${to}T23:59:59.999Z`) : null;
    const events = await prisma.campaignEvent.findMany({
      where: {
        ...(start || end ? { occurredAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {}),
        type: { in: ["SENT", "OPENED", "CLICKED", "INTEREST", "SAVED", "UNSUBSCRIBED"] },
      },
      select: { campaignId: true, type: true, occurredAt: true, campaign: { select: { subject: true } } },
      orderBy: { occurredAt: "asc" },
    });
    return aggregateCampaignStatistics(events);
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
  subscriberImportHistory: async (_args: unknown, context: { token?: string }) => {
    await requireAdmin(context);
    const jobs = await prisma.importJob.findMany({ where: { type: "SUBSCRIBER_IMPORT" }, orderBy: { createdAt: "desc" }, take: 20, include: { createdBy: true } });
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
    publicationStatus?: "DRAFT" | "PUBLISHED";
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

    ...(context.admin && filter?.publicationStatus
      ? {
          publicationStatus: filter.publicationStatus,
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
    formatError: (error) => /Invalid `prisma\.|PrismaClient|Database error/.test(error.message) ? new GraphQLError("Internal server error") : error,
    context: (request) => ({
      token: request.raw.headers.authorization?.replace(/^Bearer /i, ""),
    }),
  })
);

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/readyz", async (_req, res) => {
  try {
    await prisma.property.findFirst({ select: { id: true } });
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});

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

app.get("/unsubscribe", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) return res.status(400).send("Invalid unsubscribe link.");
  const record = await prisma.unsubscribeToken.findUnique({ where: { tokenHash: tokenDigest(token) } });
  if (!record) return res.status(404).send("This unsubscribe link is invalid or has expired.");
  const campaignToken = typeof req.query.campaignToken === "string" ? req.query.campaignToken : undefined;
  const recipient = await campaignRecipientForToken(campaignToken);
  if (recipient?.subscriberId && recipient.subscriberId !== record.subscriberId) return res.status(400).send("Invalid unsubscribe link.");
  await prisma.$transaction([
    prisma.subscriber.update({ where: { id: record.subscriberId }, data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date(), consentGrantedAt: null, consentVersion: null } }),
    prisma.consent.create({ data: { subscriberId: record.subscriberId, type: "MARKETING", granted: false, version: "unsubscribe-v1", source: "unsubscribe-link" } }),
    prisma.unsubscribeToken.delete({ where: { id: record.id } }),
    ...(recipient ? [prisma.campaignEvent.create({ data: { campaignId: recipient.campaignId, subscriberId: record.subscriberId, recipientId: recipient.id, type: "UNSUBSCRIBED", deduplicationKey: `unsubscribe:${recipient.campaignId}:${record.subscriberId}` } })] : []),
  ]);
  res.type("html").send("<h1>You have been unsubscribed</h1><p>You will no longer receive Harborstone Homes marketing emails.</p>");
});

const transparentTrackingGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

app.get("/campaign-open/:token", async (req, res) => {
  try {
    const recipient = await campaignRecipientForToken(req.params.token);
    if (recipient) {
      await prisma.campaignEvent.upsert({
        where: { deduplicationKey: `open:${recipient.id}` },
        create: {
          campaignId: recipient.campaignId,
          subscriberId: recipient.subscriberId,
          recipientId: recipient.id,
          type: "OPENED",
          deduplicationKey: `open:${recipient.id}`,
        },
        update: {},
      });
    }
  } catch {
    // Email rendering must remain unaffected when tracking storage is unavailable.
  }
  res.status(200).set("Cache-Control", "no-store, max-age=0").type("gif").send(transparentTrackingGif);
});

app.get("/campaign-click", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId : "";
  const destination = typeof req.query.destination === "string" ? req.query.destination : "";
  const recipient = await campaignRecipientForToken(token);
  if (!recipient || (!propertyId && !destination)) return res.status(404).send("This campaign link is invalid or has expired.");
  let target: string;
  if (propertyId) {
    const property = await prisma.campaignProperty.findFirst({ where: { campaignId: recipient.campaignId, propertyId }, select: { propertyId: true } });
    if (!property?.propertyId) return res.status(404).send("This campaign link is invalid or has expired.");
    target = `${publicAppUrl()}/properties/${encodeURIComponent(propertyId)}?campaignToken=${encodeURIComponent(token)}`;
  } else {
    try {
      const targetUrl = new URL(destination);
      if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") throw new Error("Invalid protocol");
      target = targetUrl.toString();
    } catch {
      return res.status(404).send("This campaign link is invalid or has expired.");
    }
  }
  await prisma.campaignEvent.create({ data: { campaignId: recipient.campaignId, subscriberId: recipient.subscriberId, recipientId: recipient.id, propertyId: propertyId || null, type: "CLICKED" } });
  res.redirect(302, target);
});

export function startServer(port = Number(process.env.PORT ?? 4000)) {
  assertProductionRuntimeConfiguration();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Backend listening on port ${port}`);
    void verifyMailTransport();
  });

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, closing backend`);
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    server.close(async () => {
      try {
        await prisma.$disconnect();
        process.exit(0);
      } catch {
        process.exit(1);
      }
    });
  }
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
  return server;
}

if (process.argv[1] && basename(process.argv[1]) === "server.js") startServer();
