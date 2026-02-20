-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "finalizedById" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "finalPrice" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "agentShare" INTEGER NOT NULL,
    "officeShare" INTEGER NOT NULL,
    "notes" TEXT,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_fileId_key" ON "contracts"("fileId");

-- CreateIndex
CREATE INDEX "contracts_officeId_idx" ON "contracts"("officeId");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "property_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
