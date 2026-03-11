-- AlterTable: add agentId to share_links for showing a specific agent on the public share page
ALTER TABLE "share_links" ADD COLUMN "agentId" TEXT;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
