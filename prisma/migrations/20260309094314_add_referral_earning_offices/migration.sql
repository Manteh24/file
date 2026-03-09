-- CreateTable
CREATE TABLE "referral_monthly_earning_offices" (
    "earningId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,

    CONSTRAINT "referral_monthly_earning_offices_pkey" PRIMARY KEY ("earningId","officeId")
);

-- AddForeignKey
ALTER TABLE "referral_monthly_earning_offices" ADD CONSTRAINT "referral_monthly_earning_offices_earningId_fkey" FOREIGN KEY ("earningId") REFERENCES "referral_monthly_earnings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_monthly_earning_offices" ADD CONSTRAINT "referral_monthly_earning_offices_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
