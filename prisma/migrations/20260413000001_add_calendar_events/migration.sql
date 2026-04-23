-- Migration: CalendarEvent + CalendarEventAttendee

-- 1. CalendarEventType enum
CREATE TYPE "CalendarEventType" AS ENUM ('REMINDER', 'NOTE', 'MEETING');

-- 2. CalendarEvent table
CREATE TABLE "calendar_events" (
  "id"          TEXT NOT NULL,
  "officeId"    TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "type"        "CalendarEventType" NOT NULL,
  "eventDate"   TIMESTAMP(3) NOT NULL,
  "startTime"   TEXT,
  "endTime"     TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calendar_events_officeId_eventDate_idx"
  ON "calendar_events"("officeId", "eventDate");

ALTER TABLE "calendar_events"
  ADD CONSTRAINT "calendar_events_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_events"
  ADD CONSTRAINT "calendar_events_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. CalendarEventAttendee join table
CREATE TABLE "calendar_event_attendees" (
  "eventId" TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  CONSTRAINT "calendar_event_attendees_pkey" PRIMARY KEY ("eventId", "userId")
);

ALTER TABLE "calendar_event_attendees"
  ADD CONSTRAINT "calendar_event_attendees_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_event_attendees"
  ADD CONSTRAINT "calendar_event_attendees_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
