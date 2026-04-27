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

  // Куратор получает список всех непроверенных работ
  async getPendingSubmissions() {
    const subs = await this.prisma.submission.findMany({
      where: { status: 'PENDING' },
      include: {
        user: true,
        lesson: {
          include: { theme: { include: { course: true } } }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    // Форматируем красиво для фронтенда
    return subs.map(sub => ({
      id: sub.id,
      studentName: sub.user.name ? `${sub.user.name} ${sub.user.surname || ''}`.trim() : 'Ученик',
      courseName: sub.lesson.theme.course.title,
      lessonTitle: sub.lesson.title,
      question: sub.question,
      answer: sub.answer,
      maxScore: sub.max_score,
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

  // 🔥 НОВЫЙ МЕТОД: Поиск работы конкретного ученика (используем lesson_id и user_id)
  async getSubmissionForStudent(lessonId: string, userId: string) {
    return this.prisma.submission.findFirst({
      where: {
        lesson_id: lessonId,
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc' // Берем самую свежую, если он отправлял ДЗ несколько раз
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