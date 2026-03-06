-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminNote" TEXT;

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "officeId" TEXT,
    "label" TEXT,
    "commissionPerOfficePerMonth" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" TEXT,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_monthly_earnings" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "activeOfficeCount" INTEGER NOT NULL,
    "commissionAmount" BIGINT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paidByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_monthly_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_broadcasts" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetOfficeId" TEXT,
    "targetFilter" JSONB,
    "recipientCount" INTEGER NOT NULL,
    "sendSms" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentByAdminId" TEXT NOT NULL,

    CONSTRAINT "admin_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByAdminId" TEXT,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_officeId_key" ON "referral_codes"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_officeId_key" ON "referrals"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_monthly_earnings_referralCodeId_yearMonth_key" ON "referral_monthly_earnings"("referralCodeId", "yearMonth");

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_monthly_earnings" ADD CONSTRAINT "referral_monthly_earnings_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_monthly_earnings" ADD CONSTRAINT "referral_monthly_earnings_paidByAdminId_fkey" FOREIGN KEY ("paidByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_broadcasts" ADD CONSTRAINT "admin_broadcasts_sentByAdminId_fkey" FOREIGN KEY ("sentByAdminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
