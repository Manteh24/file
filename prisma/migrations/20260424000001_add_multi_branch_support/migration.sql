-- Phase B — Multi-branch support (TEAM tier).
-- Purely additive. No data backfill; HQ is created lazily by /api/branches/enable.

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managerId" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "offices" ADD COLUMN     "multiBranchEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareCustomersAcrossBranches" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shareFilesAcrossBranches" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "property_files" ADD COLUMN     "branchId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "branches_managerId_key" ON "branches"("managerId");

-- CreateIndex
CREATE INDEX "customers_branchId_idx" ON "customers"("branchId");

-- CreateIndex
CREATE INDEX "property_files_branchId_idx" ON "property_files"("branchId");

-- AddForeignKey
ALTER TABLE "property_files" ADD CONSTRAINT "property_files_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
