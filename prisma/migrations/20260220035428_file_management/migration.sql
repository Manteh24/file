-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'LONG_TERM_RENT', 'SHORT_TERM_RENT', 'PRE_SALE');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'VILLA', 'LAND', 'COMMERCIAL', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SOLD', 'RENTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('OWNER', 'TENANT', 'LANDLORD', 'BUYER');

-- CreateTable
CREATE TABLE "property_files" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'ACTIVE',
    "propertyType" "PropertyType",
    "area" INTEGER,
    "floorNumber" INTEGER,
    "totalFloors" INTEGER,
    "buildingAge" INTEGER,
    "salePrice" INTEGER,
    "depositAmount" INTEGER,
    "rentAmount" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "neighborhood" TEXT,
    "locationAnalysis" JSONB,
    "description" TEXT,
    "hasElevator" BOOLEAN NOT NULL DEFAULT false,
    "hasParking" BOOLEAN NOT NULL DEFAULT false,
    "hasStorage" BOOLEAN NOT NULL DEFAULT false,
    "hasBalcony" BOOLEAN NOT NULL DEFAULT false,
    "hasSecurity" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_assignments" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_photos" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "priceField" TEXT NOT NULL,
    "oldPrice" INTEGER,
    "newPrice" INTEGER,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "customPrice" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_files_officeId_idx" ON "property_files"("officeId");

-- CreateIndex
CREATE INDEX "property_files_officeId_status_idx" ON "property_files"("officeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "file_assignments_fileId_userId_key" ON "file_assignments"("fileId", "userId");

-- CreateIndex
CREATE INDEX "activity_logs_fileId_idx" ON "activity_logs"("fileId");

-- CreateIndex
CREATE INDEX "price_history_fileId_idx" ON "price_history"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_token_idx" ON "share_links"("token");

-- AddForeignKey
ALTER TABLE "property_files" ADD CONSTRAINT "property_files_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_files" ADD CONSTRAINT "property_files_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assignments" ADD CONSTRAINT "file_assignments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "property_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assignments" ADD CONSTRAINT "file_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "property_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_photos" ADD CONSTRAINT "file_photos_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "property_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "property_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "property_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "property_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
