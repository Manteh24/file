-- AlterTable
ALTER TABLE "offices" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "amount" INTEGER NOT NULL,
    "authority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_authority_key" ON "payment_records"("authority");

-- CreateIndex
CREATE INDEX "payment_records_officeId_idx" ON "payment_records"("officeId");

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
