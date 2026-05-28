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

  async update(id: string, dto: any) {
    const { unlock_date, deadline, ...rest } = dto;
    return this.prisma.theme.update({
      where: { id },
      data: {
        ...rest,
        ...(unlock_date !== undefined ? { unlock_date: unlock_date ? new Date(unlock_date) : null } : {}),
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      },
    });
  }

  async delete(id: string) {
    return this.prisma.theme.delete({
      where: { id },
    });
  }

  async reorder(id: string, newOrderIndex: number) {
    const theme = await this.prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new Error('Theme not found');

    const oldOrderIndex = theme.order_index;
    const courseId = theme.course_id;

    await this.prisma.$transaction(async (prisma) => {
      if (oldOrderIndex < newOrderIndex) {
        await prisma.theme.updateMany({
          where: { course_id: courseId, order_index: { gt: oldOrderIndex, lte: newOrderIndex } },
          data: { order_index: { decrement: 1 } },
        });
      } else if (oldOrderIndex > newOrderIndex) {
        await prisma.theme.updateMany({
          where: { course_id: courseId, order_index: { gte: newOrderIndex, lt: oldOrderIndex } },
          data: { order_index: { increment: 1 } },
        });
      }

      await prisma.theme.update({
        where: { id },
        data: { order_index: newOrderIndex },
      });
    });

    return { success: true };
  }
}