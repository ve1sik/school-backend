import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LessonService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        order_index: dto.order_index,
        theme_id: dto.themeId,
        type: dto.type || 'VIDEO',
        video_url: dto.video_url || null,
        content: dto.content || null,
        test_data: dto.test_data || null,
        is_homework: dto.is_homework || false,
      },
    });
  }

  async update(id: string, dto: any) {
    return this.prisma.lesson.update({
      where: { id },
      data: {
        title: dto.title,
        type: dto.type,
        video_url: dto.video_url,
        content: dto.content,
        test_data: dto.test_data,
        is_homework: dto.is_homework,
      },
    });
  }

  // 🔥 ФИЧА: Умное перетаскивание со сдвигом остальных уроков
  async reorder(id: string, newThemeId: string, newOrderIndex: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new Error('Lesson not found');

    const oldThemeId = lesson.theme_id;
    const oldOrderIndex = lesson.order_index;

    // Используем транзакцию, чтобы данные не сломались, если запрос прервется
    await this.prisma.$transaction(async (prisma) => {
      if (oldThemeId === newThemeId) {
        // Если перетаскиваем внутри ОДНОГО модуля
        if (oldOrderIndex < newOrderIndex) {
          // Тащим ВНИЗ: сдвигаем элементы вверх
          await prisma.lesson.updateMany({
            where: { theme_id: newThemeId, order_index: { gt: oldOrderIndex, lte: newOrderIndex } },
            data: { order_index: { decrement: 1 } },
          });
        } else if (oldOrderIndex > newOrderIndex) {
          // Тащим ВВЕРХ: сдвигаем элементы вниз
          await prisma.lesson.updateMany({
            where: { theme_id: newThemeId, order_index: { gte: newOrderIndex, lt: oldOrderIndex } },
            data: { order_index: { increment: 1 } },
          });
        }
      } else {
        // Если перетаскиваем в ДРУГОЙ модуль
        // 1. Освобождаем место в новом модуле (сдвигаем всех вниз)
        await prisma.lesson.updateMany({
          where: { theme_id: newThemeId, order_index: { gte: newOrderIndex } },
          data: { order_index: { increment: 1 } },
        });
        // 2. Закрываем дыру в старом модуле (сдвигаем всех вверх)
        await prisma.lesson.updateMany({
          where: { theme_id: oldThemeId, order_index: { gt: oldOrderIndex } },
          data: { order_index: { decrement: 1 } },
        });
      }

      // Наконец, ставим наш урок на его законное новое место
      await prisma.lesson.update({
        where: { id },
        data: { theme_id: newThemeId, order_index: newOrderIndex },
      });
    });

    return { success: true };
  }

  async getByTheme(themeId: string) {
    return this.prisma.lesson.findMany({
      where: { theme_id: themeId },
      orderBy: { order_index: 'asc' },
    });
  }

  async delete(id: string) {
    return this.prisma.lesson.delete({
      where: { id },
    });
  }

  async updateVisibility(id: string, is_visible: boolean) {
    return this.prisma.lesson.update({
      where: { id },
      data: { is_visible },
    });
  }
}