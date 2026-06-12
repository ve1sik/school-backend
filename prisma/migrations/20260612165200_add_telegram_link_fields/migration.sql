ALTER TABLE "users"
ADD COLUMN "telegram_code" TEXT,
ADD COLUMN "telegram_chat_id" TEXT,
ADD COLUMN "telegram_linked_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_telegram_code_key" ON "users"("telegram_code");
