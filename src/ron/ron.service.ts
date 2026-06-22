import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { gradeAutoBlock, isAutoGradableBlockType } from './auto-grade.util';

@Injectable()
export class RonService {
  constructor(private prisma: PrismaService) {}

  async listTasks(userId: string) {
    const tasks = await this.prisma.ronTask.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
    });

    return tasks.map((task) => ({
      id: task.id,
      lessonId: task.lesson_id,
      blockId: task.block_id,
      courseId: task.course_id,
      themeId: task.theme_id,
      courseTitle: task.course_title,
      themeTitle: task.theme_title,
      lessonTitle: task.lesson_title,
      blockTitle: task.block_title,
      block: this.parseBlock(task.block_data),
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }));
  }

  async countTasks(userId: string) {
    return this.prisma.ronTask.count({ where: { user_id: userId } });
  }

  async upsertTask(userId: string, body: any) {
    const block = body.blockData || body.block;
    if (!block || !isAutoGradableBlockType(block.type)) {
      return { skipped: true };
    }

    const task = await this.prisma.ronTask.upsert({
      where: {
        user_id_lesson_id_block_id: {
          user_id: userId,
          lesson_id: body.lessonId,
          block_id: String(body.blockId),
        },
      },
      create: {
        user_id: userId,
        lesson_id: body.lessonId,
        block_id: String(body.blockId),
        block_data: JSON.stringify(block),
        course_id: body.courseId || null,
        theme_id: body.themeId || null,
        course_title: body.courseTitle || null,
        theme_title: body.themeTitle || null,
        lesson_title: body.lessonTitle || null,
        block_title: body.blockTitle || null,
      },
      update: {
        block_data: JSON.stringify(block),
        course_id: body.courseId || null,
        theme_id: body.themeId || null,
        course_title: body.courseTitle || null,
        theme_title: body.themeTitle || null,
        lesson_title: body.lessonTitle || null,
        block_title: body.blockTitle || null,
      },
    });

    return { id: task.id };
  }

  async removeTask(userId: string, lessonId: string, blockId: string) {
    await this.prisma.ronTask.deleteMany({
      where: { user_id: userId, lesson_id: lessonId, block_id: String(blockId) },
    });
    return { ok: true };
  }

  async submitAnswer(userId: string, taskId: string, selected: string[]) {
    const task = await this.prisma.ronTask.findUnique({ where: { id: taskId } });
    if (!task || task.user_id !== userId) throw new NotFoundException('Задание не найдено');

    const block = this.parseBlock(task.block_data);
    if (!block) throw new NotFoundException('Блок задания повреждён');

    const { isSuccess } = gradeAutoBlock(block, selected);
    if (isSuccess) {
      await this.prisma.ronTask.delete({ where: { id: taskId } });
      return { correct: true, message: 'Отлично! Задание выполнено и убрано из РОН.' };
    }

    return { correct: false, message: 'Пока неверно. Попробуй ещё раз.' };
  }

  private parseBlock(raw: string) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
