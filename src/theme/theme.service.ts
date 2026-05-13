import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Путь к Prisma проверь у себя!

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

  // 🔥 Четко говорим Присме, что именно сохранять
  async update(id: string, data: { title?: string; is_visible?: boolean }) {
    const updateData: any = {};
    
    if (data.title !== undefined && data.title !== null) {
      updateData.title = data.title;
    }
    if (data.is_visible !== undefined && data.is_visible !== null) {
      updateData.is_visible = data.is_visible;
    }

    if (Object.keys(updateData).length === 0) {
      return this.prisma.theme.findUnique({ where: { id } });
    }

    return this.prisma.theme.update({
      where: { id },
      data: updateData,
    });
  }
}