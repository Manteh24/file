-- CreateTable: scheduled_sms
-- A rent follow-up SMS scheduled to be sent automatically on a future date.
-- One record per contract (UNIQUE on contractId).

CREATE TABLE "scheduled_sms" (
    "id"          TEXT NOT NULL,
    "officeId"    TEXT NOT NULL,
    "contractId"  TEXT NOT NULL,
    "phone"       TEXT NOT NULL,
    "message"     TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt"      TIMESTAMP(3),
    "failedAt"    TIMESTAMP(3),
    "errorMsg"    TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_sms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_sms_contractId_key" ON "scheduled_sms"("contractId");

-- CreateIndex
CREATE INDEX "scheduled_sms_scheduledAt_idx" ON "scheduled_sms"("scheduledAt");

-- AddForeignKey
ALTER TABLE "scheduled_sms" ADD CONSTRAINT "scheduled_sms_officeId_fkey"
    FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_sms" ADD CONSTRAINT "scheduled_sms_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
