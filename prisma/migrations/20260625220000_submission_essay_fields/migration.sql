-- Сочинение: критерии K1–K10, пометки ошибок, тип блока
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "block_type" TEXT;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "criteria_scores" JSONB;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "error_annotations" JSONB;
