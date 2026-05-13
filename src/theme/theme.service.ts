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

  async delete(id: string) {
    return this.prisma.theme.delete({
      where: { id },
    });
  }

  // 🔥 ИЗМЕНЕНО: Строго формируем объект обновления, чтобы Prisma всё поняла
  async update(id: string, data: { title?: string; is_visible?: boolean }) {
    const updateData: any = {};
    
    // Добавляем только те поля, которые реально пришли
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    
    if (data.is_visible !== undefined) {
      updateData.is_visible = data.is_visible;
    }

    // Если пришел пустой запрос, просто возвращаем текущую тему
    if (Object.keys(updateData).length === 0) {
      return this.prisma.theme.findUnique({ where: { id } });
    }

    return this.prisma.theme.update({
      where: { id },
      data: updateData,
    });
  }
}