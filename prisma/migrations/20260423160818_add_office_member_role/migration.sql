-- CreateEnum
CREATE TYPE "OfficeMemberRole" AS ENUM ('AGENT', 'BRANCH_MANAGER', 'ACCOUNTANT', 'RECEPTIONIST', 'MARKETING', 'CUSTOM');

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "types" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "officeMemberRole" "OfficeMemberRole",
ADD COLUMN     "permissionsOverride" JSONB;
