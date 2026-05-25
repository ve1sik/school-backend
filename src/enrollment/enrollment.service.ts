import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new BadRequestException('Курс не найден.');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден.');

    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, course_id: courseId },
    });
    if (existingEnrollment) {
      throw new BadRequestException('Пользователь уже записан на этот курс.');
    }

    return this.prisma.enrollment.create({
      data: {
        user: { connect: { id: userId } },
        course: { connect: { id: courseId } },
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });
  }

  async unenroll(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, course_id: courseId },
    });
    if (!enrollment) throw new NotFoundException('Запись на курс не найдена.');

    await this.prisma.enrollment.delete({ where: { id: enrollment.id } });
    return { success: true };
  }

  async getMyCourses(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { user_id: userId },
      include: {
        course: true,
      },
    });
  }
}
