-- CreateEnum
CREATE TYPE "TrialFilter" AS ENUM ('ANY', 'TRIAL_ONLY', 'PAID_ONLY');

-- CreateTable
CREATE TABLE "admin_access_rules" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "plans" "Plan"[] DEFAULT ARRAY[]::"Plan"[],
    "trialFilter" "TrialFilter" NOT NULL DEFAULT 'ANY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_access_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_access_rules_adminUserId_idx" ON "admin_access_rules"("adminUserId");

-- AddForeignKey
ALTER TABLE "admin_access_rules" ADD CONSTRAINT "admin_access_rules_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
