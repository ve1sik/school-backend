import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ThemeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    return this.prisma.theme.create({
      data: {
        course_id: dto.courseId,
        title: dto.title,
        order_index: dto.order_index,
      },
    });
  }

  // 🔥 Точная копия из курсов: берем весь dto и шьем прямо в базу!
  async update(id: string, dto: any) {
    return this.prisma.theme.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    // Удаляем связанные уроки, чтобы не было мусора в базе
    await this.prisma.lesson.deleteMany({
      where: { theme_id: id }
    });

    return this.prisma.theme.delete({
      where: { id },
    });
  }
}