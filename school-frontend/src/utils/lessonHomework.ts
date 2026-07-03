/** Извлечение блоков домашки из урока (ученик получает homeworkBlocks без полного content). */

export function getHomeworkBlocksFromLesson(lesson: any): any[] {
  if (Array.isArray(lesson?.homeworkBlocks) && lesson.homeworkBlocks.length > 0) {
    return lesson.homeworkBlocks;
  }
  if (!lesson?.content) return [];
  try {
    const parsed = JSON.parse(String(lesson.content).trim());
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b: any) => b.isHomework);
  } catch {
    return [];
  }
}

export function lessonHasHomework(lesson: any): boolean {
  if (lesson?.hasHomework === true) return true;
  if (lesson?.is_homework === true) return true;
  return getHomeworkBlocksFromLesson(lesson).length > 0;
}
