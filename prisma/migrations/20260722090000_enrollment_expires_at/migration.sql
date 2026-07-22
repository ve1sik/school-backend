-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enrollments_expires_at_idx" ON "enrollments"("expires_at");
