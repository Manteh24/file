-- AlterTable: make title nullable (NOTE events have no title)
ALTER TABLE "calendar_events" ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable: add reminder and sound columns
ALTER TABLE "calendar_events" ADD COLUMN "reminderMinutes" INTEGER;
ALTER TABLE "calendar_events" ADD COLUMN "playSound" BOOLEAN NOT NULL DEFAULT false;
