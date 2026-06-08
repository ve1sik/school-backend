import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const AUTO_GRADE_COMMENT_PREFIX = '🤖 Автоматическая проверка';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  private async canGradeStudentLesson(studentId: string, lessonId: string, requesterId?: string, requesterRole?: string) {
    if (requesterRole === 'ADMIN') return true;
    if (!requesterId || !['CURATOR', 'TEACHER'].includes(requesterRole || '')) return false;

    const group = await this.prisma.group.findFirst({
      where: {
        students: { some: { id: studentId } },
        ...(requesterRole === 'CURATOR' ? { curator_id: requesterId } : { teacher_id: requesterId }),
        courses: {
          some: {
            themes: {
              some: {
                lessons: { some: { id: lessonId } },
              },
            },
          },
        },
      },
      select: { id: true },
    });

    return !!group;
  }

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
      blockId: sub.block_id,
      question: sub.question,
      answer: sub.answer,
      maxScore: sub.max_score,
      score: sub.score,
      comment: sub.comment,
      status: sub.status,
      isAutoGraded,
      updated_at: sub.updated_at,
      created_at: sub.created_at,
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

  async createOralSubmission(body: any, requesterId?: string, requesterRole?: string) {
    const studentId = body.studentId || body.userId;
    const lessonId = body.lessonId;
    if (!studentId || !lessonId) {
      throw new Error('studentId и lessonId обязательны');
    }

    const canGrade = await this.canGradeStudentLesson(studentId, lessonId, requesterId, requesterRole);
    if (!canGrade) throw new ForbiddenException('Нет доступа к этому ученику или уроку');

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
      max_score: body.maxScore || 100,
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

  async getOralSubmission(studentId: string, lessonId: string, requesterId?: string, requesterRole?: string) {
    const canGrade = await this.canGradeStudentLesson(studentId, lessonId, requesterId, requesterRole);
    if (!canGrade) return null;

    return this.prisma.submission.findFirst({
      where: {
        user_id: studentId,
        lesson_id: lessonId,
        block_id: `oral-${lessonId}`,
      },
      orderBy: { updated_at: 'desc' },
    });
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

    const scopeClause =
      requesterRole === 'CURATOR' && requesterId
        ? {
            AND: [
              { user: { groups: { some: { curator_id: requesterId } } } },
              { lesson: { theme: { course: { groups: { some: { curator_id: requesterId } } } } } },
            ],
          }
        : {};

    const where = { ...statusClause, ...scopeClause };

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
    const finalComment = comment?.trim() ? comment : existing?.comment || '';

    const updated = await this.prisma.submission.update({
      where: { id },
      data: {
        score: finalStatus === 'REVISION' ? null : score,
        comment: finalComment,
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
      orderBy: { updated_at: 'desc' },
    });
  }
}