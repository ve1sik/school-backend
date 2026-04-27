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

  async updateVisibility(id: string, is_visible: boolean) {
    return this.prisma.theme.update({
      where: { id },
      data: { is_visible },
    });
  }
}