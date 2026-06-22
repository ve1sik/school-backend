import { useCallback } from 'react';
import { api } from '../lib/api';
import { isAutoGradableBlockType } from '../utils/autoGrade';

type RonContext = {
  lessonId: string;
  blockId: string;
  block: any;
  courseId?: string;
  themeId?: string;
  courseTitle?: string;
  themeTitle?: string;
  lessonTitle?: string;
  blockTitle?: string;
};

export function useRonSync() {
  const addRonTask = useCallback(async (ctx: RonContext) => {
    if (!isAutoGradableBlockType(ctx.block?.type)) return;
    try {
      await api.post('/ron/tasks', {
        lessonId: ctx.lessonId,
        blockId: ctx.blockId,
        blockData: ctx.block,
        courseId: ctx.courseId,
        themeId: ctx.themeId,
        courseTitle: ctx.courseTitle,
        themeTitle: ctx.themeTitle,
        lessonTitle: ctx.lessonTitle,
        blockTitle: ctx.blockTitle,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const removeRonTask = useCallback(async (lessonId: string, blockId: string) => {
    try {
      await api.delete(`/ron/tasks/${lessonId}/${blockId}`);
    } catch {
      /* ignore */
    }
  }, []);

  return { addRonTask, removeRonTask };
}
