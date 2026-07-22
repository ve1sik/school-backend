import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string, courseId: string, accessDays?: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new BadRequestException('Курс не найден.');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден.');

    const days = Number(accessDays);
    const expiresAt =
      Number.isFinite(days) && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : null;

    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, course_id: courseId },
    });
    if (existingEnrollment) {
      if (expiresAt) {
        return this.prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { expires_at: expiresAt },
          include: { course: { select: { id: true, title: true } } },
        });
      }
      throw new BadRequestException('Пользователь уже записан на этот курс.');
    }

    return this.prisma.enrollment.create({
      data: {
        user: { connect: { id: userId } },
        course: { connect: { id: courseId } },
        expires_at: expiresAt,
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });
  }

  async extendAccess(userId: string, courseId: string, accessDays: number) {
    const days = Number(accessDays);
    if (!Number.isFinite(days) || days <= 0) {
      throw new BadRequestException('Укажите срок доступа в днях');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, course_id: courseId },
    });
    if (!enrollment) throw new NotFoundException('Запись на курс не найдена.');

    const base =
      enrollment.expires_at && enrollment.expires_at > new Date()
        ? enrollment.expires_at
        : new Date();
    const expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { expires_at: expiresAt },
      include: { course: { select: { id: true, title: true } } },
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
