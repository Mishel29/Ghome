-- Replace internal news slugs with external news links.
ALTER TABLE "NewsArticle" DROP CONSTRAINT IF EXISTS "NewsArticle_slug_key";
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'NewsArticle' AND column_name = 'slug'
	) THEN
		ALTER TABLE "NewsArticle" RENAME COLUMN "slug" TO "externalUrl";
	END IF;
END $$;