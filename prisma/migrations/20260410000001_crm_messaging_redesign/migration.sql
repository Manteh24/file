-- Migration: CRM multi-type, ContractCustomer join table, ShareLink→Customer link, OfficeMessage

-- ─── 1. Customer: replace single type with types array ────────────────────────
ALTER TABLE "customers" ADD COLUMN "types" "CustomerType"[] NOT NULL DEFAULT '{}';
UPDATE "customers" SET "types" = ARRAY["type"::"CustomerType"];
ALTER TABLE "customers" DROP COLUMN "type";

-- ─── 2. ShareLink: optional customer link ─────────────────────────────────────
ALTER TABLE "share_links" ADD COLUMN "customerId" TEXT;
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 3. ContractCustomer join table ───────────────────────────────────────────
CREATE TABLE "contract_customers" (
  "id"         TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "role"       "CustomerType" NOT NULL,
  CONSTRAINT "contract_customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contract_customers_contractId_customerId_key"
  ON "contract_customers"("contractId", "customerId");
ALTER TABLE "contract_customers" ADD CONSTRAINT "contract_customers_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_customers" ADD CONSTRAINT "contract_customers_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 4. MessageChannel enum ───────────────────────────────────────────────────
CREATE TYPE "MessageChannel" AS ENUM ('SMS', 'NOTIFICATION', 'EMAIL');

-- ─── 5. OfficeMessage table ───────────────────────────────────────────────────
CREATE TABLE "office_messages" (
  "id"             TEXT NOT NULL,
  "officeId"       TEXT NOT NULL,
  "senderId"       TEXT NOT NULL,
  "channel"        "MessageChannel" NOT NULL,
  "subject"        TEXT,
  "body"           TEXT NOT NULL,
  "recipientCount" INTEGER NOT NULL,
  "filterLabel"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "office_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "office_messages_officeId_idx" ON "office_messages"("officeId");
ALTER TABLE "office_messages" ADD CONSTRAINT "office_messages_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "office_messages" ADD CONSTRAINT "office_messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
