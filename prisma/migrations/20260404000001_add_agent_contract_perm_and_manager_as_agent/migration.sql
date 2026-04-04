-- AlterTable: add canFinalizeContracts to users
ALTER TABLE "users" ADD COLUMN "canFinalizeContracts" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add managerIsAgent to offices
ALTER TABLE "offices" ADD COLUMN "managerIsAgent" BOOLEAN NOT NULL DEFAULT true;
