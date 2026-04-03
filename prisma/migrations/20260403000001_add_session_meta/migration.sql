-- AlterTable: add lastActiveAt and userAgent to user_sessions
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
