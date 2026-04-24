-- Reconciliation migration.
--
-- Background: several columns (offices.logoUrl, officeBio, photoEnhancementMode,
-- watermarkMode, PhotoProcessMode enum, 7 property_files amenity columns, users.bio)
-- and the PhotoProcessMode enum exist in every live database (dev + production) but
-- were lost from the migration folder when an earlier migration file was edited
-- after being applied. This migration restores them to migration history using
-- idempotent SQL so it is a no-op on databases that already have them, and an
-- actual create on a fresh database.
--
-- Safe to run on any environment. Must precede the TEAM-expansion migrations.

-- ─── PhotoProcessMode enum ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PhotoProcessMode" AS ENUM ('ALWAYS', 'NEVER', 'ASK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── offices: logoUrl, officeBio, photoEnhancementMode, watermarkMode ─────────
ALTER TABLE "offices" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "offices" ADD COLUMN IF NOT EXISTS "officeBio" TEXT;
ALTER TABLE "offices"
  ADD COLUMN IF NOT EXISTS "photoEnhancementMode" "PhotoProcessMode" NOT NULL DEFAULT 'ALWAYS';
ALTER TABLE "offices"
  ADD COLUMN IF NOT EXISTS "watermarkMode" "PhotoProcessMode" NOT NULL DEFAULT 'ALWAYS';

-- ─── property_files: 7 amenity columns ────────────────────────────────────────
ALTER TABLE "property_files" ADD COLUMN IF NOT EXISTS "hasGym" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "property_files" ADD COLUMN IF NOT EXISTS "hasPool" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "property_files" ADD COLUMN IF NOT EXISTS "hasWesternToilet" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "property_files" ADD COLUMN IF NOT EXISTS "hasSmartHome" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "property_files" ADD COLUMN IF NOT EXISTS "hasSauna" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "property_files" ADD COLUMN IF NOT EXISTS "hasJacuzzi" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "property_files" ADD COLUMN IF NOT EXISTS "hasRoofGarden" BOOLEAN NOT NULL DEFAULT false;

-- ─── users: bio ───────────────────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
