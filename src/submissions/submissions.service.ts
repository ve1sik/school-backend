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
      lessonId: sub.lesson_id || sub.lesson?.id || null,
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

    const submission = await this.prisma.submission.create({
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

    // 🎮 Очки за верный авто-ответ
    if (isSuccess) {
      await this.awardPoints(userId, 15);
    }

    return submission;
  }

  async createOralSubmission(body: any) {
    const studentId = body.studentId || body.userId;
    const lessonId = body.lessonId;
    if (!studentId || !lessonId) {
      throw new Error('studentId и lessonId обязательны');
    }

    const blockId = body.blockId || `oral-${lessonId}`;
    const existing = await this.prisma.submission.findFirst({
      where: {
        user_id: studentId,
        lesson_id: lessonId,
        block_id: blockId,
      },
      orderBy: { created_at: 'desc' },
    });

    const data = {
      user_id: studentId,
      lesson_id: lessonId,
      block_id: blockId,
      question: body.question || 'Устный ответ',
      answer: body.answer || body.comment || 'Устный ответ',
      max_score: body.maxScore || 10,
      score: Number(body.score) || 0,
      comment: body.comment || 'Устный ответ',
      status: 'GRADED' as const,
    };

    if (existing) {
      return this.prisma.submission.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.submission.create({ data });
  }

  // 🎮 Безопасное начисление очков (не валит основную операцию при сбое)
  private async awardPoints(userId: string, amount: number) {
    if (!amount || amount <= 0) return;
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { points: { increment: amount } } as any,
      });
    } catch {
      /* очки не критичны */
    }
  }

  async getSubmissionsByStatus(
    status: 'PENDING' | 'GRADED',
    requesterId?: string,
    requesterRole?: string,
  ) {
    // Если куратор — ограничиваем только студентами его групп
    let studentIdsFilter: string[] | undefined;
    if (requesterRole === 'CURATOR' && requesterId) {
      const groups = await this.prisma.group.findMany({
        where: { curator_id: requesterId },
        select: { students: { select: { id: true } } },
      });
      studentIdsFilter = groups.flatMap((g) => g.students.map((s) => s.id));
      // Нет групп — нет работ
      if (studentIdsFilter.length === 0) return [];
    }

    const statusClause =
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

    const where = studentIdsFilter
      ? { ...statusClause, user_id: { in: studentIdsFilter } }
      : statusClause;

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

  // Куратор ставит оценку или возвращает на доработку
  async gradeSubmission(id: string, score: number, comment: string, status?: string) {
    const finalStatus = status === 'REVISION' ? 'REVISION' : 'GRADED';
    const existing = await this.prisma.submission.findUnique({ where: { id } });

    const updated = await this.prisma.submission.update({
      where: { id },
      data: {
        score: finalStatus === 'REVISION' ? null : score,
        comment,
        status: finalStatus as any,
      },
    });

    // 🎮 Очки за проверенную работу — только при первом переходе в GRADED
    if (
      finalStatus === 'GRADED' &&
      existing?.status !== 'GRADED' &&
      typeof score === 'number' &&
      score > 0
    ) {
      const pts = Math.round((score / (updated.max_score || 1)) * 30);
      await this.awardPoints(updated.user_id, pts);
    }

    return updated;
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