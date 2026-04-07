// Файл: src/enrollment/enrollment.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  // Запись на курс
  async enroll(userId: string, courseId: string) {
    // 1. Проверяем, существует ли курс
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new BadRequestException('Курс не найден.');

    // 2. Проверяем, не записан ли уже студент
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, course_id: courseId },
    });
    if (existingEnrollment) throw new BadRequestException('Вы уже записаны на этот курс.');

    // 3. Создаем запись
    return this.prisma.enrollment.create({
      data: {
        user: { connect: { id: userId } },
        course: { connect: { id: courseId } },
      },
      include: {
        course: true, // Сразу возвращаем инфу о курсе
      }
    });
  }

  // Получить "Мои курсы" (Для личного кабинета)
  async getMyCourses(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { user_id: userId },
      include: {
        course: true, // Подтягиваем обложку и название курса
      },
    });
  }
}