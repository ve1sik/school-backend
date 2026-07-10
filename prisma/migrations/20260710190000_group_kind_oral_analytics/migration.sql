-- CreateEnum
CREATE TYPE "GroupKind" AS ENUM ('STUDY', 'STREAM');

-- AlterTable
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "group_kind" "GroupKind" NOT NULL DEFAULT 'STUDY';

-- Публичные потоки магазина -> STREAM
UPDATE "groups" SET "group_kind" = 'STREAM' WHERE "is_public" = true;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "oral_in_analytics" BOOLEAN NOT NULL DEFAULT true;
