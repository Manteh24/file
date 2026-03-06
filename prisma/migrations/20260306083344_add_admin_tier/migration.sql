-- CreateEnum
CREATE TYPE "AdminTier" AS ENUM ('SUPPORT', 'FINANCE', 'FULL_ACCESS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminTier" "AdminTier";
