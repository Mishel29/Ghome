/*
  Warnings:

  - You are about to drop the column `areaSqm` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `bathrooms` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `bedrooms` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Property` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sourceKey]` on the table `Property` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bathroomsMax` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bathroomsMin` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bedroomsMax` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bedroomsMin` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `county` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postalCode` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceMax` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceMin` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saleType` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizeSqm` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceKey` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stage` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'COMING_SOON', 'ON_SALE', 'SOLD_OUT', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PropertyStage" AS ENUM ('PLANNING', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'FLOORPLAN', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignEventType" AS ENUM ('SENT', 'FAILED', 'OPENED', 'CLICKED', 'INTEREST', 'SAVED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PROPERTY_VIEW', 'PROPERTY_SAVE', 'PROPERTY_COMPARE', 'INTEREST_SUBMITTED', 'MORTGAGE_CALCULATED', 'NEWS_VIEW', 'CAMPAIGN_CLICK');

-- CreateEnum
CREATE TYPE "RagSourceType" AS ENUM ('PROPERTY', 'NEWS', 'FLOORPLAN', 'FAQ', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('HOME_TOUR_GENERATION', 'RAG_QUERY');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportJobType" AS ENUM ('PROPERTY_IMPORT', 'SUBSCRIBER_IMPORT');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "areaSqm",
DROP COLUMN "bathrooms",
DROP COLUMN "bedrooms",
DROP COLUMN "price",
DROP COLUMN "title",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "bathroomsMax" INTEGER NOT NULL,
ADD COLUMN     "bathroomsMin" INTEGER NOT NULL,
ADD COLUMN     "bedroomsMax" INTEGER NOT NULL,
ADD COLUMN     "bedroomsMin" INTEGER NOT NULL,
ADD COLUMN     "completionYear" INTEGER,
ADD COLUMN     "county" TEXT NOT NULL,
ADD COLUMN     "listedDate" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "postalCode" TEXT NOT NULL,
ADD COLUMN     "priceMax" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "priceMin" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "saleType" TEXT NOT NULL,
ADD COLUMN     "sizeCategory" TEXT,
ADD COLUMN     "sizeSqm" INTEGER NOT NULL,
ADD COLUMN     "sourceKey" TEXT NOT NULL,
ADD COLUMN     "stage" "PropertyStage" NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "PropertyStatus" NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyMedia" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyFeature" (
    "propertyId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,

    CONSTRAINT "PropertyFeature_pkey" PRIMARY KEY ("propertyId","featureId")
);

-- CreateTable
CREATE TABLE "PropertyValueHistory" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "growthPercent" DECIMAL(65,30),

    CONSTRAINT "PropertyValueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedProperty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "dataConsent" BOOLEAN NOT NULL DEFAULT false,
    "followUpSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "interestId" TEXT,
    "type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "templateHtml" TEXT,
    "createdById" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignProperty" (
    "campaignId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "CampaignProperty_pkey" PRIMARY KEY ("campaignId","propertyId")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT,
    "propertyId" TEXT,
    "type" "CampaignEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "htmlContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsProperty" (
    "newsArticleId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "NewsProperty_pkey" PRIMARY KEY ("newsArticleId","propertyId")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "propertyId" TEXT,
    "campaignId" TEXT,
    "eventType" "AnalyticsEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" "RagSourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "type" "AiJobType" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "type" "ImportJobType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "filename" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successfulRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PropertyMedia_propertyId_idx" ON "PropertyMedia"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_name_key" ON "Feature"("name");

-- CreateIndex
CREATE INDEX "PropertyValueHistory_year_idx" ON "PropertyValueHistory"("year");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyValueHistory_propertyId_year_key" ON "PropertyValueHistory"("propertyId", "year");

-- CreateIndex
CREATE INDEX "SavedProperty_userId_idx" ON "SavedProperty"("userId");

-- CreateIndex
CREATE INDEX "SavedProperty_propertyId_idx" ON "SavedProperty"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedProperty_userId_propertyId_key" ON "SavedProperty"("userId", "propertyId");

-- CreateIndex
CREATE INDEX "Interest_propertyId_idx" ON "Interest"("propertyId");

-- CreateIndex
CREATE INDEX "Interest_userId_idx" ON "Interest"("userId");

-- CreateIndex
CREATE INDEX "Interest_agentId_idx" ON "Interest"("agentId");

-- CreateIndex
CREATE INDEX "Interest_createdAt_idx" ON "Interest"("createdAt");

-- CreateIndex
CREATE INDEX "Consent_userId_idx" ON "Consent"("userId");

-- CreateIndex
CREATE INDEX "Consent_interestId_idx" ON "Consent"("interestId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE INDEX "Subscriber_status_idx" ON "Subscriber"("status");

-- CreateIndex
CREATE INDEX "Subscriber_subscribedAt_idx" ON "Subscriber"("subscribedAt");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_subscriberId_idx" ON "CampaignRecipient"("subscriberId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_status_idx" ON "CampaignRecipient"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_subscriberId_key" ON "CampaignRecipient"("campaignId", "subscriberId");

-- CreateIndex
CREATE INDEX "CampaignEvent_campaignId_idx" ON "CampaignEvent"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignEvent_subscriberId_idx" ON "CampaignEvent"("subscriberId");

-- CreateIndex
CREATE INDEX "CampaignEvent_propertyId_idx" ON "CampaignEvent"("propertyId");

-- CreateIndex
CREATE INDEX "CampaignEvent_type_idx" ON "CampaignEvent"("type");

-- CreateIndex
CREATE INDEX "CampaignEvent_occurredAt_idx" ON "CampaignEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "NewsArticle_published_idx" ON "NewsArticle"("published");

-- CreateIndex
CREATE INDEX "NewsArticle_publishDate_idx" ON "NewsArticle"("publishDate");

-- CreateIndex
CREATE INDEX "NewsProperty_propertyId_idx" ON "NewsProperty"("propertyId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_propertyId_idx" ON "AnalyticsEvent"("propertyId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_campaignId_idx" ON "AnalyticsEvent"("campaignId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RagDocument_propertyId_idx" ON "RagDocument"("propertyId");

-- CreateIndex
CREATE INDEX "RagDocument_sourceType_idx" ON "RagDocument"("sourceType");

-- CreateIndex
CREATE INDEX "RagChunk_documentId_idx" ON "RagChunk"("documentId");

-- CreateIndex
CREATE INDEX "AiJob_propertyId_idx" ON "AiJob"("propertyId");

-- CreateIndex
CREATE INDEX "AiJob_type_idx" ON "AiJob"("type");

-- CreateIndex
CREATE INDEX "AiJob_status_idx" ON "AiJob"("status");

-- CreateIndex
CREATE INDEX "AiJob_createdAt_idx" ON "AiJob"("createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_type_idx" ON "ImportJob"("type");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Property_sourceKey_key" ON "Property"("sourceKey");

-- CreateIndex
CREATE INDEX "Property_county_idx" ON "Property"("county");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Property_stage_idx" ON "Property"("stage");

-- CreateIndex
CREATE INDEX "Property_priceMin_idx" ON "Property"("priceMin");

-- CreateIndex
CREATE INDEX "Property_bedroomsMin_idx" ON "Property"("bedroomsMin");

-- CreateIndex
CREATE INDEX "Property_bathroomsMin_idx" ON "Property"("bathroomsMin");

-- CreateIndex
CREATE INDEX "Property_listedDate_idx" ON "Property"("listedDate");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMedia" ADD CONSTRAINT "PropertyMedia_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFeature" ADD CONSTRAINT "PropertyFeature_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFeature" ADD CONSTRAINT "PropertyFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyValueHistory" ADD CONSTRAINT "PropertyValueHistory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedProperty" ADD CONSTRAINT "SavedProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedProperty" ADD CONSTRAINT "SavedProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProperty" ADD CONSTRAINT "CampaignProperty_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProperty" ADD CONSTRAINT "CampaignProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsProperty" ADD CONSTRAINT "NewsProperty_newsArticleId_fkey" FOREIGN KEY ("newsArticleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsProperty" ADD CONSTRAINT "NewsProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagChunk" ADD CONSTRAINT "RagChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RagDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
