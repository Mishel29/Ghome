import "dotenv/config";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import { prisma } from "../lib/prisma.js";

const ADMIN_EMAIL = "admin@e2e.harborstone.test";
const ADMIN_PASSWORD = "e2e-admin-password";
const USER_EMAIL = "user@e2e.harborstone.test";
const USER_PASSWORD = "e2e-user-password";
const TRACKING_TOKEN = "e2e-campaign-token";
const UNSUBSCRIBE_TOKEN = "e2e-unsubscribe-token";

function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function assertDisposableDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (process.env.E2E_TEST_MODE !== "true" || !databaseUrl) throw new Error("E2E seed requires E2E_TEST_MODE=true and DATABASE_URL.");
  const parsed = new URL(databaseUrl);
  if (!parsed.pathname.endsWith("_test") || parsed.hostname !== "postgres") throw new Error("E2E seed only permits the disposable Docker postgres *_test database.");
}

async function createProperty(id: string, name: string, publicationStatus: "PUBLISHED" | "DRAFT", agentId: string) {
  const now = new Date();
  return prisma.property.create({
    data: {
      id,
      name,
      location: "Dublin",
      county: "Dublin",
      address: `${name} Avenue`,
      postalCode: "D02 E2E0",
      type: "Two bedroom home",
      saleType: "New homes",
      status: "ON_SALE",
      stage: "READY_TO_MOVE",
      priceMin: 400000,
      priceMax: 450000,
      bedroomsMin: 2,
      bedroomsMax: 2,
      bathroomsMin: 2,
      bathroomsMax: 2,
      sizeSqm: 90,
      sizeSqmMax: 95,
      bedroomOptions: [2],
      bathroomOptions: [2],
      completionYear: 2026,
      description: `${name} deterministic E2E fixture.`,
      listedDate: now,
      publicationStatus,
      publishedAt: publicationStatus === "PUBLISHED" ? now : null,
      agentId,
      media: { create: { url: "https://images.example.test/e2e-home.jpg", type: "IMAGE", isPrimary: true } },
      valueHistory: { create: { year: 2026, value: 400000, growthPercent: 0 } },
    },
  });
}

async function main() {
  assertDisposableDatabase();
  const tables = ["AiJobAttempt", "DeliveryAttempt", "ImportRowError", "ImportChunk", "PropertyImportUpload", "ImportJob", "RagChunk", "RagDocument", "PageMedia", "PageContent", "NewsProperty", "NewsArticle", "TemplateProperty", "CampaignTemplate", "CampaignEvent", "CampaignRecipient", "CampaignProperty", "Campaign", "UnsubscribeToken", "Consent", "InterestFollowUp", "Interest", "SavedProperty", "PropertyValueHistory", "PropertyFeature", "PropertyMedia", "Feature", "AnalyticsEvent", "Session", "AuditLog", "Property", "Subscriber", "Development", "User"];
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((table) => `"${table}"`).join(", ")} CASCADE`);

  const admin = await prisma.user.create({ data: { id: "e2e-admin", name: "E2E Administrator", email: ADMIN_EMAIL, passwordHash: passwordHash(ADMIN_PASSWORD), role: "ADMIN" } });
  await prisma.user.create({ data: { id: "e2e-user", name: "E2E User", email: USER_EMAIL, passwordHash: passwordHash(USER_PASSWORD), role: "USER" } });
  await createProperty("e2e-property-a", "E2E Property A", "PUBLISHED", admin.id);
  await createProperty("e2e-property-b", "E2E Property B", "PUBLISHED", admin.id);
  await createProperty("e2e-property-c", "E2E Property C", "PUBLISHED", admin.id);
  await createProperty("e2e-property-draft", "E2E Draft Property", "DRAFT", admin.id);

  const subscriber = await prisma.subscriber.create({
    data: { id: "e2e-subscriber", name: "E2E Subscriber", email: "subscriber@e2e.harborstone.test", status: "ACTIVE", subscribedAt: new Date(), consentGrantedAt: new Date(), consentVersion: "e2e-v1" },
  });
  const campaign = await prisma.campaign.create({
    data: {
      id: "e2e-campaign",
      subject: "E2E Campaign",
      status: "SENT",
      templateHtml: "<p>E2E campaign</p>",
      createdById: admin.id,
      recipientCount: 1,
      sentAt: new Date(),
      completedAt: new Date(),
      properties: { create: { id: "e2e-campaign-property-a", propertyId: "e2e-property-a", propertyName: "E2E Property A" } },
      recipients: { create: { id: "e2e-recipient", subscriberId: subscriber.id, recipientEmail: subscriber.email, recipientName: subscriber.name, status: "SENT", sentAt: new Date(), trackingTokenHash: digest(TRACKING_TOKEN), attemptCount: 1 } },
    },
  });
  await prisma.unsubscribeToken.create({ data: { tokenHash: digest(UNSUBSCRIBE_TOKEN), subscriberId: subscriber.id } });
  const now = new Date();
  await prisma.newsArticle.createMany({ data: [
    { id: "e2e-news-published", title: "E2E Published News", summary: "Visible E2E announcement", content: "Published fixture content", publicationStatus: "PUBLISHED", publishedAt: now, activeFrom: new Date(now.getTime() - 60_000), createdById: admin.id },
    { id: "e2e-news-draft", title: "E2E Draft News", summary: "Hidden draft", publicationStatus: "DRAFT", createdById: admin.id },
    { id: "e2e-news-future", title: "E2E Future News", summary: "Hidden future", publicationStatus: "PUBLISHED", publishedAt: now, activeFrom: new Date(now.getTime() + 86_400_000), createdById: admin.id },
  ] });
  console.log(`Seeded ${campaign.id} with fixture users ${ADMIN_EMAIL} and ${USER_EMAIL}.`);
}

void main().finally(() => prisma.$disconnect());
