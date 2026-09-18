import assert from "node:assert/strict";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import test from "node:test";
import { PrismaClient } from "../generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const enabled = Boolean(databaseUrl);
const port = 4101;
const baseUrl = `http://127.0.0.1:${port}`;
const prisma = databaseUrl ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }) : null;
let server: ReturnType<typeof spawn> | undefined;

function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function graph(query: string, variables?: Record<string, unknown>, token?: string) {
  const response = await fetch(`${baseUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ query, variables }) });
  return response.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }>;
}

async function login(email: string, password: string) {
  const result = await graph("mutation($email:String!,$password:String!){login(email:$email,password:$password){token}}", { email, password });
  assert.equal(result.errors, undefined);
  return (result.data?.login as { token: string }).token;
}

test("real GraphQL critical publication, ownership, news, and unsubscribe flows", { skip: !enabled }, async () => {
  if (!prisma || !databaseUrl) return;
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Subscriber", "NewsArticle", "Property" CASCADE');
  const password = "integration-password";
  const admin = await prisma.user.create({ data: { name: "Admin", email: "admin@integration.test", role: "ADMIN", passwordHash: passwordHash(password) } });
  const userA = await prisma.user.create({ data: { name: "User A", email: "a@integration.test", role: "USER", passwordHash: passwordHash(password) } });
  const userB = await prisma.user.create({ data: { name: "User B", email: "b@integration.test", role: "USER", passwordHash: passwordHash(password) } });
  const draft = await prisma.property.create({ data: { name: "Draft", publicationStatus: "DRAFT" } });
  const published = await prisma.property.create({ data: { name: "Published", publicationStatus: "PUBLISHED", publishedAt: new Date() } });
  const offline = await prisma.property.create({ data: { name: "Offline", publicationStatus: "DRAFT", status: "OFFLINE" } });
  const activeNews = await prisma.newsArticle.create({ data: { title: "Active", publicationStatus: "PUBLISHED", publishedAt: new Date(), activeFrom: new Date(Date.now() - 60_000) } });
  await prisma.newsArticle.create({ data: { title: "Future", publicationStatus: "PUBLISHED", publishedAt: new Date(), activeFrom: new Date(Date.now() + 60_000) } });
  await prisma.newsArticle.create({ data: { title: "Draft news", publicationStatus: "DRAFT" } });
  const recipient = await prisma.subscriber.create({ data: { name: "Recipient", email: "recipient@integration.test", status: "ACTIVE", consentGrantedAt: new Date() } });
  const unsubscribed = await prisma.subscriber.create({ data: { name: "Unsubscribed", email: "unsubscribed@integration.test", status: "UNSUBSCRIBED", consentGrantedAt: new Date() } });
  const campaign = await prisma.campaign.create({ data: { subject: "Integration campaign", createdById: admin.id } });
  await prisma.campaignProperty.create({ data: { campaignId: campaign.id, propertyId: published.id, propertyName: published.name } });
  const trackingToken = randomBytes(24).toString("hex");
  const unsubscribeToken = randomBytes(24).toString("hex");
  const recipientRow = await prisma.campaignRecipient.create({ data: { campaignId: campaign.id, subscriberId: recipient.id, recipientEmail: recipient.email, recipientName: recipient.name, trackingTokenHash: createHash("sha256").update(trackingToken).digest("hex") } });
  await prisma.unsubscribeToken.create({ data: { subscriberId: recipient.id, tokenHash: createHash("sha256").update(unsubscribeToken).digest("hex") } });

  server = spawn(process.execPath, ["dist/server.js"], { env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(port), PUBLIC_APP_URL: "http://localhost:5173", PUBLIC_BACKEND_URL: baseUrl }, stdio: "ignore" });
  for (let attempt = 0; attempt < 30; attempt += 1) { try { if ((await fetch(`${baseUrl}/healthz`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); }

  const publicProperties = await graph("{properties{nodes{id name}}}");
  assert.deepEqual((publicProperties.data?.properties as { nodes: Array<{ id: string }> }).nodes.map((property) => property.id), [published.id]);
  assert.equal((await graph("query($id:ID!){property(id:$id){id}}", { id: draft.id })).data?.property, null);
  assert.equal((await graph("query($id:ID!){property(id:$id){id}}", { id: offline.id })).data?.property, null);
  const publicNews = await graph("{publicNewsPage(input:{limit:10}){nodes{title}}}");
  assert.equal(JSON.stringify(publicNews.data).includes(activeNews.title), true);
  assert.equal(JSON.stringify(publicNews.data).includes("Future"), false);
  assert.equal(JSON.stringify(publicNews.data).includes("Draft news"), false);

  const tokenA = await login(userA.email, password);
  const tokenB = await login(userB.email, password);
  const adminToken = await login(admin.email, password);
  assert.equal((await graph("mutation($id:ID!){setPropertySaved(propertyId:$id,saved:true)}", { id: published.id }, tokenA)).errors, undefined);
  assert.equal(JSON.stringify((await graph("{savedProperties{id}}", undefined, tokenA)).data).includes(published.id), true);
  assert.equal(JSON.stringify((await graph("{savedProperties{id}}", undefined, tokenB)).data).includes(published.id), false);
  assert.equal((await graph("mutation($id:ID!){setPropertySaved(propertyId:$id,saved:true)}", { id: published.id })).errors?.[0].message, "Authentication required");

  const csvHeader = "Name,Address,Postal Code,County,Price,Sold times,Property Type,Status,Stage,Agent,Description,Property Size Category,Property Size,Beds,Baths,Completion Year,Years,Historical Prices";
  const replacementCsv = `${csvHeader}\nPublished,2 Integration Street,D01,Dublin,500000,New,House,On Sale,Ready to Move,Agent,Updated,Medium,100,3,2,2024,"[2024]","[500000]"`;
  const upload = await graph("mutation($filename:String!,$content:String!){uploadPropertyCsv(filename:$filename,contentBase64:$content){id}}", { filename: "replacement.csv", content: Buffer.from(replacementCsv).toString("base64") }, adminToken);
  const uploadId = (upload.data?.uploadPropertyCsv as { id: string }).id;
  const validation = await graph("mutation($id:ID!){validatePropertyCsv(uploadId:$id){validation{valid duplicateProperties{rowNumber source existingPropertyId} unresolvedDuplicateCount}}}", { id: uploadId }, adminToken);
  const duplicate = ((validation.data?.validatePropertyCsv as { validation: { duplicateProperties: Array<{ rowNumber: number; source: string; existingPropertyId: string | null }> } }).validation.duplicateProperties)[0];
  assert.deepEqual({ source: duplicate.source, id: duplicate.existingPropertyId }, { source: "DATABASE", id: published.id });
  assert.equal((await graph("mutation($id:ID!,$resolutions:[PropertyImportDuplicateResolutionInput!]!){resolvePropertyImportDuplicates(uploadId:$id,resolutions:$resolutions){validation{unresolvedDuplicateCount}}}", { id: uploadId, resolutions: [{ rowNumber: duplicate.rowNumber, action: "REPLACE" }] }, adminToken)).errors, undefined);
  assert.equal((await graph("mutation($id:ID!){startPropertyImport(uploadId:$id){status successfulRows failedRows}}", { id: uploadId }, adminToken)).errors, undefined);
  assert.equal((await prisma.property.findUniqueOrThrow({ where: { id: published.id } })).publicationStatus, "DRAFT");
  assert.equal((await prisma.propertyValueHistory.findUniqueOrThrow({ where: { propertyId_year: { propertyId: published.id, year: 2024 } } })).value.toString(), "500000");
  const invalidCsv = `${csvHeader}\nBad history,3 Integration Street,D01,Dublin,500000,New,House,On Sale,Ready to Move,Agent,Bad,Medium,100,3,2,2024,"[2024]","[400000]"`;
  const invalidUpload = await graph("mutation($filename:String!,$content:String!){uploadPropertyCsv(filename:$filename,contentBase64:$content){id}}", { filename: "invalid.csv", content: Buffer.from(invalidCsv).toString("base64") }, adminToken);
  const invalidValidation = await graph("mutation($id:ID!){validatePropertyCsv(uploadId:$id){status validation{valid errors{errorType}}}}", { id: (invalidUpload.data?.uploadPropertyCsv as { id: string }).id }, adminToken);
  assert.equal((invalidValidation.data?.validatePropertyCsv as { validation: { valid: boolean } }).validation.valid, false);

  const preview = await graph("query($id:ID!){campaignPreview(id:$id){consentedRecipientCount}}", { id: campaign.id }, adminToken);
  assert.equal((preview.data?.campaignPreview as { consentedRecipientCount: number }).consentedRecipientCount, 1);
  const response = await fetch(`${baseUrl}/unsubscribe?token=${unsubscribeToken}&campaignToken=${trackingToken}`);
  assert.equal(response.status, 200);
  assert.equal((await prisma.subscriber.findUniqueOrThrow({ where: { id: recipient.id } })).status, "UNSUBSCRIBED");
  assert.equal(await prisma.campaignEvent.count({ where: { campaignId: campaign.id, recipientId: recipientRow.id, type: "UNSUBSCRIBED" } }), 1);
  assert.equal((await prisma.subscriber.findUniqueOrThrow({ where: { id: unsubscribed.id } })).status, "UNSUBSCRIBED");

  server.kill("SIGTERM");
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
  await prisma.$disconnect();
});
