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
        // 🔥 ФИЧА: Теперь сервис сохраняет флаг домашки!
        is_homework: dto.is_homework || false,
      },
    });
  }

  // 🔥 ФИЧА: Добавили полное сохранение (PATCH запрос из Админки)
  async update(id: string, dto: any) {
    return this.prisma.lesson.update({
      where: { id },
      data: {
        title: dto.title,
        type: dto.type,
        video_url: dto.video_url,
        content: dto.content,
        test_data: dto.test_data,
        // 🔥 ФИЧА: Разрешаем обновлять флаг домашки
        is_homework: dto.is_homework,
      },
    });
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