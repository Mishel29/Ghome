-- Replace internal news slugs with external news links.
ALTER TABLE "NewsArticle" DROP CONSTRAINT IF EXISTS "NewsArticle_slug_key";
ALTER TABLE "NewsArticle" RENAME COLUMN "slug" TO "externalUrl";