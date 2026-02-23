-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_officeId_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "officeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "admin_office_assignments" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_office_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_office_assignments_adminUserId_idx" ON "admin_office_assignments"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_office_assignments_adminUserId_officeId_key" ON "admin_office_assignments"("adminUserId", "officeId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_office_assignments" ADD CONSTRAINT "admin_office_assignments_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_office_assignments" ADD CONSTRAINT "admin_office_assignments_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
