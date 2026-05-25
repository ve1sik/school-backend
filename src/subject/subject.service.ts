import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.subject.findMany({
      include: {
        teacher: {
          select: { id: true, name: true, surname: true, email: true },
        },
        _count: { select: { courses: true } },
      },
      orderBy: { title: 'asc' },
    });
  }

  async assignTeacher(id: string, teacherId: string | null) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Предмет не найден');

    if (teacherId) {
      const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } });
      if (!teacher) throw new NotFoundException('Преподаватель не найден');
    }

    return this.prisma.subject.update({
      where: { id },
      data: teacherId
        ? { teacher: { connect: { id: teacherId } } }
        : { teacher_id: null },
      select: { id: true, title: true, teacher_id: true },
    });
  }
}
