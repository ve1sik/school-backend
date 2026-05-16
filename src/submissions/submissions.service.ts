import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  // Студент отправляет эссе
  async createSubmission(userId: string, body: any) {
    return this.prisma.submission.create({
      data: {
        user_id: userId,
        lesson_id: body.lessonId,
        block_id: body.blockId,
        question: body.question,
        answer: body.answer,
        max_score: body.maxScore || 3,
        status: 'PENDING'
      }
    });
  }

  // 🔥 ОБНОВЛЕННЫЙ МЕТОД ДЛЯ КУРАТОРА: Выдает работы с нужным статусом и сразу склеивает названия
  async getSubmissionsByStatus(status: 'PENDING' | 'GRADED') {
    const subs = await this.prisma.submission.findMany({
      where: { status },
      include: {
        user: true,
        lesson: {
          include: { theme: { include: { course: true } } }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Форматируем красиво для фронтенда куратора
    return subs.map(sub => ({
      id: sub.id,
      studentId: sub.user_id,
      studentName: sub.user.name ? `${sub.user.name} ${sub.user.surname || ''}`.trim() : sub.user.email || 'Ученик',
      courseName: sub.lesson?.theme?.course?.title || 'Неизвестный курс',
      lessonTitle: sub.lesson?.title || 'Неизвестный урок',
      question: sub.question,
      answer: sub.answer,
      maxScore: sub.max_score,
      score: sub.score,
      comment: sub.comment,
      status: sub.status,
      date: new Date(sub.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    }));
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