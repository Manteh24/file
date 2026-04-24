-- Add reminderFiredAt column to track which calendar events have already had their reminder fired by the cron.
ALTER TABLE "calendar_events" ADD COLUMN "reminderFiredAt" TIMESTAMP(3);

-- Index supports the cron query: WHERE "reminderFiredAt" IS NULL AND "eventDate" >= ...
CREATE INDEX "calendar_events_reminderFiredAt_eventDate_idx" ON "calendar_events"("reminderFiredAt", "eventDate");
