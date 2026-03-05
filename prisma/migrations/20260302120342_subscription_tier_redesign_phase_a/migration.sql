-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Plan" ADD VALUE 'FREE';
ALTER TYPE "Plan" ADD VALUE 'PRO';
ALTER TYPE "Plan" ADD VALUE 'TEAM';

-- AlterTable
ALTER TABLE "payment_records" ADD COLUMN     "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
-- NOTE: plan default stays 'TRIAL' here (an existing value) so this migration
-- replays cleanly on the shadow DB. Phase B migration sets the default to 'PRO'
-- after the new enum values have been committed in a separate transaction.
ALTER TABLE "subscriptions" ADD COLUMN     "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "isTrial" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "plan" SET DEFAULT 'TRIAL',
ALTER COLUMN "trialEndsAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "branchId" TEXT;

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "shamsiMonth" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_logs_officeId_shamsiMonth_key" ON "ai_usage_logs"("officeId", "shamsiMonth");

-- CreateIndex
CREATE INDEX "branches_officeId_idx" ON "branches"("officeId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
