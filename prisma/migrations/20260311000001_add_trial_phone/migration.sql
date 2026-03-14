-- CreateTable
CREATE TABLE "trial_phones" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trial_phones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trial_phones_phone_key" ON "trial_phones"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "trial_phones_officeId_key" ON "trial_phones"("officeId");

-- AddForeignKey
ALTER TABLE "trial_phones" ADD CONSTRAINT "trial_phones_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
