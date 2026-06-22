-- CreateTable
CREATE TABLE "ron_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "block_data" TEXT NOT NULL,
    "course_id" TEXT,
    "theme_id" TEXT,
    "course_title" TEXT,
    "theme_title" TEXT,
    "lesson_title" TEXT,
    "block_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ron_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ron_tasks_user_id_idx" ON "ron_tasks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ron_tasks_user_id_lesson_id_block_id_key" ON "ron_tasks"("user_id", "lesson_id", "block_id");

-- AddForeignKey
ALTER TABLE "ron_tasks" ADD CONSTRAINT "ron_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ron_tasks" ADD CONSTRAINT "ron_tasks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
