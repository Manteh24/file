-- Phase B: Remove legacy Plan enum values (TRIAL, SMALL, LARGE).
--
-- PostgreSQL does not support DROP VALUE on enums, so we:
--   1. Create a new Plan enum with only the current values
--   2. Migrate all columns using the old enum to the new one (USING cast)
--   3. Drop the old enum
--   4. Rename the new enum to "Plan"
--   5. Set the correct default on subscriptions.plan
--
-- This migration is safe to apply only after scripts/migrate-plans.ts has been
-- run, which guarantees no rows contain TRIAL, SMALL, or LARGE values.

-- Step 1: Create replacement enum with current values only
CREATE TYPE "Plan_new" AS ENUM ('FREE', 'PRO', 'TEAM');

-- Step 2: Migrate subscriptions.plan
ALTER TABLE "subscriptions"
  ALTER COLUMN "plan" DROP DEFAULT,
  ALTER COLUMN "plan" TYPE "Plan_new" USING "plan"::text::"Plan_new",
  ALTER COLUMN "plan" SET DEFAULT 'PRO';

-- Step 3: Migrate payment_records.plan
ALTER TABLE "payment_records"
  ALTER COLUMN "plan" TYPE "Plan_new" USING "plan"::text::"Plan_new";

-- Step 4: Drop old enum and rename replacement
DROP TYPE "Plan";
ALTER TYPE "Plan_new" RENAME TO "Plan";
