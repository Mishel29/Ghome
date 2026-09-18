-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('MARKETING', 'INTEREST', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TemplatePurpose" AS ENUM ('CAMPAIGN', 'INTEREST_FOLLOW_UP');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IndexStatus" AS ENUM ('PENDING', 'INDEXED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportUploadStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'INVALID', 'READY', 'CONSUMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportChunkStatus" AS ENUM ('WAITING', 'ACTIVE', 'RETRYING', 'COMPLETED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CampaignStatus" ADD VALUE 'QUEUED';
ALTER TYPE "CampaignStatus" ADD VALUE 'SENDING';
ALTER TYPE "CampaignStatus" ADD VALUE 'PARTIALLY_FAILED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ImportJobStatus" ADD VALUE 'READY';
ALTER TYPE "ImportJobStatus" ADD VALUE 'QUEUED';
ALTER TYPE "ImportJobStatus" ADD VALUE 'PARTIALLY_COMPLETED';
ALTER TYPE "ImportJobStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "SubscriberStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "CampaignProperty" DROP CONSTRAINT "CampaignProperty_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignRecipient" DROP CONSTRAINT "CampaignRecipient_subscriberId_fkey";

-- DropForeignKey
ALTER TABLE "Consent" DROP CONSTRAINT "Consent_interestId_fkey";

-- DropForeignKey
ALTER TABLE "Consent" DROP CONSTRAINT "Consent_userId_fkey";

-- DropIndex
DROP INDEX "NewsArticle_publishDate_idx";

-- DropIndex
DROP INDEX "NewsArticle_published_idx";

-- AlterTable
ALTER TABLE "AiJob" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "providerTaskId" TEXT,
ADD COLUMN     "queuedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "bodyText" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "newsArticleId" TEXT,
ADD COLUMN     "recipientCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "renderedHtml" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "templateId" TEXT;

-- AlterTable
ALTER TABLE "CampaignEvent" ADD COLUMN     "deduplicationKey" TEXT,
ADD COLUMN     "recipientId" TEXT;

-- Preserve links while converting the legacy compound key to a surrogate key.
ALTER TABLE "CampaignProperty" DROP CONSTRAINT "CampaignProperty_pkey",
ADD COLUMN "id" TEXT,
ADD COLUMN "propertyName" TEXT,
ADD COLUMN "propertySnapshot" JSONB,
ALTER COLUMN "propertyId" DROP NOT NULL;
UPDATE "CampaignProperty" AS link
SET "id" = md5(random()::text || clock_timestamp()::text || link."campaignId" || COALESCE(link."propertyId", '')),
    "propertyName" = COALESCE(property."name", 'Removed property')
FROM "Property" AS property
WHERE property."id" = link."propertyId";
UPDATE "CampaignProperty" SET "id" = md5(random()::text || clock_timestamp()::text), "propertyName" = COALESCE("propertyName", 'Removed property') WHERE "id" IS NULL;
ALTER TABLE "CampaignProperty" ALTER COLUMN "id" SET NOT NULL, ALTER COLUMN "propertyName" SET NOT NULL,
ADD CONSTRAINT "CampaignProperty_pkey" PRIMARY KEY ("id");

-- Backfill recipient contact details before enforcing the newer delivery contract.
ALTER TABLE "CampaignRecipient" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "recipientEmail" TEXT,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "renderedHtml" TEXT,
ADD COLUMN     "trackingTokenHash" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3);
UPDATE "CampaignRecipient" AS recipient
SET "recipientEmail" = COALESCE(subscriber."email", 'unknown@example.invalid'),
    "recipientName" = COALESCE(subscriber."name", 'Unknown recipient'),
    "updatedAt" = recipient."createdAt"
FROM "Subscriber" AS subscriber
WHERE subscriber."id" = recipient."subscriberId";
UPDATE "CampaignRecipient" SET "recipientEmail" = COALESCE("recipientEmail", 'unknown@example.invalid'), "recipientName" = COALESCE("recipientName", 'Unknown recipient'), "updatedAt" = COALESCE("updatedAt", "createdAt") WHERE "recipientEmail" IS NULL OR "recipientName" IS NULL OR "updatedAt" IS NULL;
ALTER TABLE "CampaignRecipient" ALTER COLUMN "recipientEmail" SET NOT NULL, ALTER COLUMN "recipientName" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "subscriberId" DROP NOT NULL,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "DeliveryStatus" USING "status"::"DeliveryStatus",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "CampaignTemplate" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "purpose" "TemplatePurpose" NOT NULL DEFAULT 'CAMPAIGN';

ALTER TABLE "Consent" ADD COLUMN "source" TEXT,
ADD COLUMN "subscriberId" TEXT,
ALTER COLUMN "type" TYPE "ConsentPurpose" USING "type"::"ConsentPurpose";

-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "completedJobs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "errorSummary" TEXT,
ADD COLUMN     "failedJobs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "totalJobs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uploadId" TEXT;

-- Carry legacy publication state forward before removing retired columns.
ALTER TABLE "NewsArticle" ADD COLUMN "activeFrom" TIMESTAMP(3),
ADD COLUMN     "activeUntil" TIMESTAMP(3),
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "publishedAt" TIMESTAMP(3);
UPDATE "NewsArticle" SET "publicationStatus" = CASE WHEN "published" THEN 'PUBLISHED'::"PublicationStatus" ELSE 'DRAFT'::"PublicationStatus" END,
    "publishedAt" = "publishDate", "activeFrom" = "publishDate";
ALTER TABLE "NewsArticle" DROP COLUMN "publishDate", DROP COLUMN "published";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "bathroomOptions" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "bedroomOptions" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "developmentId" TEXT,
ADD COLUMN     "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "sizeSqmMax" DECIMAL(12,2),
ADD COLUMN     "slug" TEXT,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "bathroomsMax" DROP NOT NULL,
ALTER COLUMN "bathroomsMin" DROP NOT NULL,
ALTER COLUMN "bedroomsMax" DROP NOT NULL,
ALTER COLUMN "bedroomsMin" DROP NOT NULL,
ALTER COLUMN "county" DROP NOT NULL,
ALTER COLUMN "postalCode" DROP NOT NULL,
ALTER COLUMN "priceMax" DROP NOT NULL,
ALTER COLUMN "priceMin" DROP NOT NULL,
ALTER COLUMN "saleType" DROP NOT NULL,
ALTER COLUMN "sizeSqm" DROP NOT NULL,
ALTER COLUMN "sizeSqm" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "sourceKey" DROP NOT NULL,
ALTER COLUMN "stage" DROP NOT NULL,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "PropertyMedia" ADD COLUMN     "aiJobId" TEXT,
ADD COLUMN     "altText" TEXT,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "storageKey" TEXT;

-- AlterTable
ALTER TABLE "PropertyValueHistory" ADD COLUMN     "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "RagChunk" ADD COLUMN     "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "externalVectorId" TEXT,
ADD COLUMN     "ordinal" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RagDocument" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "indexStatus" "IndexStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "indexedAt" TIMESTAMP(3),
ADD COLUMN     "mediaId" TEXT,
ADD COLUMN     "newsArticleId" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "consentGrantedAt" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT,
ADD COLUMN     "unsubscribeTokenHash" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "subscribedAt" DROP NOT NULL,
ALTER COLUMN "subscribedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "TemplateProperty" (
    "templateId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "TemplateProperty_pkey" PRIMARY KEY ("templateId","propertyId")
);

-- CreateTable
CREATE TABLE "Development" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Development_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageContent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heroHeading" TEXT,
    "heroText" TEXT,
    "heroImageUrl" TEXT,
    "introduction" TEXT,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "developmentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageMedia" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestFollowUp" (
    "id" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "templateId" TEXT,
    "sentById" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "sendRequestedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJobAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiJobAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnsubscribeToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnsubscribeToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyImportUpload" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "type" "ImportJobType" NOT NULL DEFAULT 'PROPERTY_IMPORT',
    "byteSize" INTEGER NOT NULL,
    "content" TEXT,
    "status" "ImportUploadStatus" NOT NULL DEFAULT 'UPLOADED',
    "validation" JSONB,
    "validatedRows" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyImportUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportChunk" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "records" JSONB,
    "totalRows" INTEGER NOT NULL,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportChunkStatus" NOT NULL DEFAULT 'WAITING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRowError" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "chunkId" TEXT,
    "rowNumber" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT,
    "message" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,

    CONSTRAINT "ImportRowError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateProperty_propertyId_idx" ON "TemplateProperty"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Development_slug_key" ON "Development"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PageContent_slug_key" ON "PageContent"("slug");

-- CreateIndex
CREATE INDEX "PageContent_publicationStatus_publishedAt_idx" ON "PageContent"("publicationStatus", "publishedAt");

-- CreateIndex
CREATE INDEX "PageMedia_pageId_sortOrder_idx" ON "PageMedia"("pageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "InterestFollowUp_interestId_createdAt_idx" ON "InterestFollowUp"("interestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAttempt_recipientId_attemptNumber_key" ON "DeliveryAttempt"("recipientId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AiJobAttempt_jobId_attemptNumber_key" ON "AiJobAttempt"("jobId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UnsubscribeToken_tokenHash_key" ON "UnsubscribeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "UnsubscribeToken_subscriberId_idx" ON "UnsubscribeToken"("subscriberId");

-- CreateIndex
CREATE INDEX "PropertyImportUpload_expiresAt_status_idx" ON "PropertyImportUpload"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "PropertyImportUpload_createdById_createdAt_idx" ON "PropertyImportUpload"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "ImportChunk_status_queuedAt_idx" ON "ImportChunk"("status", "queuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportChunk_importId_chunkIndex_key" ON "ImportChunk"("importId", "chunkIndex");

-- CreateIndex
CREATE INDEX "ImportRowError_importId_rowNumber_idx" ON "ImportRowError"("importId", "rowNumber");

-- CreateIndex
CREATE INDEX "Campaign_sentAt_idx" ON "Campaign"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignEvent_deduplicationKey_key" ON "CampaignEvent"("deduplicationKey");

-- CreateIndex
CREATE INDEX "CampaignEvent_recipientId_idx" ON "CampaignEvent"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignProperty_campaignId_propertyId_key" ON "CampaignProperty"("campaignId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_providerMessageId_key" ON "CampaignRecipient"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_trackingTokenHash_key" ON "CampaignRecipient"("trackingTokenHash");

-- CreateIndex
CREATE INDEX "CampaignRecipient_status_nextAttemptAt_idx" ON "CampaignRecipient"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "CampaignRecipient_sentAt_idx" ON "CampaignRecipient"("sentAt");

-- CreateIndex
CREATE INDEX "Consent_subscriberId_createdAt_idx" ON "Consent"("subscriberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_uploadId_key" ON "ImportJob"("uploadId");

-- CreateIndex
CREATE INDEX "NewsArticle_publicationStatus_activeFrom_idx" ON "NewsArticle"("publicationStatus", "activeFrom");

-- CreateIndex
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_publicationStatus_publishedAt_idx" ON "Property"("publicationStatus", "publishedAt");

-- CreateIndex
CREATE INDEX "PropertyMedia_aiJobId_idx" ON "PropertyMedia"("aiJobId");

-- CreateIndex
CREATE UNIQUE INDEX "RagChunk_externalVectorId_key" ON "RagChunk"("externalVectorId");

-- CreateIndex
CREATE UNIQUE INDEX "RagChunk_documentId_ordinal_key" ON "RagChunk"("documentId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_unsubscribeTokenHash_key" ON "Subscriber"("unsubscribeTokenHash");

-- CreateIndex
CREATE INDEX "Subscriber_unsubscribedAt_idx" ON "Subscriber"("unsubscribedAt");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMedia" ADD CONSTRAINT "PropertyMedia_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "AiJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_newsArticleId_fkey" FOREIGN KEY ("newsArticleId") REFERENCES "NewsArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CampaignTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProperty" ADD CONSTRAINT "CampaignProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CampaignRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTemplate" ADD CONSTRAINT "CampaignTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateProperty" ADD CONSTRAINT "TemplateProperty_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CampaignTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateProperty" ADD CONSTRAINT "TemplateProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_newsArticleId_fkey" FOREIGN KEY ("newsArticleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "PropertyMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "PropertyImportUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageContent" ADD CONSTRAINT "PageContent_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageContent" ADD CONSTRAINT "PageContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageMedia" ADD CONSTRAINT "PageMedia_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "PageContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestFollowUp" ADD CONSTRAINT "InterestFollowUp_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestFollowUp" ADD CONSTRAINT "InterestFollowUp_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CampaignTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestFollowUp" ADD CONSTRAINT "InterestFollowUp_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CampaignRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJobAttempt" ADD CONSTRAINT "AiJobAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnsubscribeToken" ADD CONSTRAINT "UnsubscribeToken_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImportUpload" ADD CONSTRAINT "PropertyImportUpload_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportChunk" ADD CONSTRAINT "ImportChunk_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRowError" ADD CONSTRAINT "ImportRowError_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRowError" ADD CONSTRAINT "ImportRowError_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "ImportChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

