import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const AUTO_GRADE_COMMENT_PREFIX = '🤖 Автоматическая проверка';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  private mapSubmissionForCurator(sub: any) {
    const isAutoGraded =
      sub.status === 'GRADED' &&
      typeof sub.comment === 'string' &&
      sub.comment.includes(AUTO_GRADE_COMMENT_PREFIX);

    return {
      id: sub.id,
      studentId: sub.user_id,
      studentName: sub.user.name
        ? `${sub.user.name} ${sub.user.surname || ''}`.trim()
        : sub.user.email || 'Ученик',
      courseName: sub.lesson?.theme?.course?.title || 'Неизвестный курс',
      lessonTitle: sub.lesson?.title || 'Неизвестный урок',
      question: sub.question,
      answer: sub.answer,
      maxScore: sub.max_score,
      score: sub.score,
      comment: sub.comment,
      status: sub.status,
      isAutoGraded,
      date: new Date(sub.created_at).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  // Студент сдаёт работу (письменные — на проверку куратору)
  async createSubmission(userId: string, body: any) {
    return this.prisma.submission.create({
      data: {
        user_id: userId,
        lesson_id: body.lessonId,
        block_id: body.blockId,
        question: body.question,
        answer: body.answer,
        max_score: body.maxScore || 3,
        status: 'PENDING',
      },
    });
  }

  // Автопроверка: сразу GRADED для ученика, но видно куратору во входящих
  async createAutoGradedSubmission(
    userId: string,
    body: any,
    score: number,
    isSuccess: boolean,
  ) {
    const comment = isSuccess
      ? `${AUTO_GRADE_COMMENT_PREFIX}: Верно!`
      : `${AUTO_GRADE_COMMENT_PREFIX}: Неверно. Попытки исчерпаны.`;

    return this.prisma.submission.create({
      data: {
        user_id: userId,
        lesson_id: body.lessonId,
        block_id: body.blockId,
        question: body.question,
        answer: body.answer,
        max_score: body.maxScore || 3,
        score,
        comment,
        status: 'GRADED',
      },
    });
  }

  async getSubmissionsByStatus(status: 'PENDING' | 'GRADED') {
    const where =
      status === 'PENDING'
        ? {
            OR: [
              { status: 'PENDING' as const },
              {
                status: 'GRADED' as const,
                comment: { contains: AUTO_GRADE_COMMENT_PREFIX },
              },
            ],
          }
        : { status: 'GRADED' as const };

    const subs = await this.prisma.submission.findMany({
      where,
      include: {
        user: true,
        lesson: {
          include: { theme: { include: { course: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return subs.map((sub) => this.mapSubmissionForCurator(sub));
  }

  // Куратор ставит оценку
  async gradeSubmission(id: string, score: number, comment: string) {
    return this.prisma.submission.update({
      where: { id },
      data: {
        score,
        comment,
        status: 'GRADED'
      }
    });
  }

  // Поиск работы конкретного ученика
  async getSubmissionForStudent(lessonId: string, userId: string) {
    return this.prisma.submission.findFirst({
      where: {
        lesson_id: lessonId,
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc' 
      }
    });
  }

  // Получить ВСЕ работы конкретного студента
  async getMySubmissions(userId: string) {
    return this.prisma.submission.findMany({
      where: { user_id: userId },
    });
  }
}