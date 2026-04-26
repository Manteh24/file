-- CreateTable
CREATE TABLE "referral_bonus_payouts" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "referredOfficeId" TEXT NOT NULL,
    "paymentRecordId" TEXT NOT NULL,
    "amountToman" INTEGER NOT NULL,
    "paymentToman" INTEGER NOT NULL,
    "percentApplied" INTEGER NOT NULL,
    "capApplied" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_bonus_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_bonus_payouts_referredOfficeId_key" ON "referral_bonus_payouts"("referredOfficeId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_bonus_payouts_paymentRecordId_key" ON "referral_bonus_payouts"("paymentRecordId");

-- CreateIndex
CREATE INDEX "referral_bonus_payouts_referralCodeId_idx" ON "referral_bonus_payouts"("referralCodeId");

-- CreateIndex
CREATE INDEX "referral_bonus_payouts_status_idx" ON "referral_bonus_payouts"("status");

-- AddForeignKey
ALTER TABLE "referral_bonus_payouts" ADD CONSTRAINT "referral_bonus_payouts_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_bonus_payouts" ADD CONSTRAINT "referral_bonus_payouts_referredOfficeId_fkey" FOREIGN KEY ("referredOfficeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_bonus_payouts" ADD CONSTRAINT "referral_bonus_payouts_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "payment_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_bonus_payouts" ADD CONSTRAINT "referral_bonus_payouts_paidByAdminId_fkey" FOREIGN KEY ("paidByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
