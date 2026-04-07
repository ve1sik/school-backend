// Файл: src/lesson/lesson.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/lesson.dto';

@Injectable()
export class LessonService {
  constructor(private readonly prisma: PrismaService) {}

  // Создать урок
  async create(dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        video_url: dto.video_url,
        content: dto.content,
        order_index: dto.order_index,
        theme_id: dto.theme_id,
      },
    });
  }

  // Получить все уроки конкретной темы
  async getByTheme(themeId: string) {
    return this.prisma.lesson.findMany({
      where: { theme_id: themeId },
      orderBy: { order_index: 'asc' }, // Выводим по порядку
    });
  }
}