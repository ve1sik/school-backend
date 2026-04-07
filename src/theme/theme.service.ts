// Файл: src/theme/theme.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThemeDto } from './dto/theme.dto';

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}

  // Создать тему
  async create(dto: CreateThemeDto) {
    return this.prisma.theme.create({
      data: {
        title: dto.title,
        order_index: dto.order_index,
        course_id: dto.course_id,
      },
    });
  }

  // Получить темы конкретного курса
  async getByCourse(courseId: string) {
    return this.prisma.theme.findMany({
      where: { course_id: courseId },
      orderBy: { order_index: 'asc' }, // Сортируем по порядку
      include: { lessons: true } // Сразу подтянем будущие уроки
    });
  }
}