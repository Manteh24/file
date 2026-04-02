-- CreateTable
CREATE TABLE "sms_usage_logs" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "shamsiMonth" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sms_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sms_usage_logs_officeId_shamsiMonth_key" ON "sms_usage_logs"("officeId", "shamsiMonth");

-- AddForeignKey
ALTER TABLE "sms_usage_logs" ADD CONSTRAINT "sms_usage_logs_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
