-- AlterTable
ALTER TABLE "offices" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "admin_login_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_login_logs_adminId_idx" ON "admin_login_logs"("adminId");

-- AddForeignKey
ALTER TABLE "admin_login_logs" ADD CONSTRAINT "admin_login_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
