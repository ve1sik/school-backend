-- AlterTable
ALTER TABLE "users" ADD COLUMN "telegram_chat_id" TEXT;
ALTER TABLE "users" ADD COLUMN "telegram_link_code" TEXT;
ALTER TABLE "users" ADD COLUMN "telegram_linked_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_chat_id_key" ON "users"("telegram_chat_id");
CREATE UNIQUE INDEX "users_telegram_link_code_key" ON "users"("telegram_link_code");
