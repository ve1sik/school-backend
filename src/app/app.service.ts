import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  private canSeePendingApps(role?: string, permissions: string[] = []) {
    return (
      role === 'ADMIN' ||
      permissions.includes('MANAGE_USERS') ||
      permissions.includes('MANAGE_GROUPS')
    );
  }

  async getShell(userId: string, role?: string, permissions: string[] = []) {
    const pendingWhere: { status: 'PENDING'; group?: { curator_id: string } } = { status: 'PENDING' };
    if (
      role !== 'ADMIN' &&
      !permissions.includes('MANAGE_USERS') &&
      permissions.includes('MANAGE_GROUPS')
    ) {
      pendingWhere.group = { curator_id: userId };
    }

    const [user, messagesUnread, ronCount, pendingApplications, pendingSubmissions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          surname: true,
          patronymic: true,
          avatar: true,
          role: true,
          admin_permissions: true,
          city: true,
          birthday: true,
          invite_code: true,
        },
      }),
      this.prisma.message.count({
        where: { receiver_id: userId, is_read: false },
      }),
      this.prisma.ronTask.count({ where: { user_id: userId } }),
      this.canSeePendingApps(role, permissions)
        ? this.prisma.groupApplication.count({ where: pendingWhere })
        : Promise.resolve(0),
      this.getPendingSubmissionsBadge(userId, role, permissions),
    ]);

    return {
      user,
      badges: {
        messages: messagesUnread,
        ron: ronCount,
        pendingApplications,
        pendingSubmissions,
      },
    };
  }

  private async getPendingSubmissionsBadge(userId: string, role?: string, permissions: string[] = []) {
    if (role !== 'ADMIN' && role !== 'CURATOR' && role !== 'TEACHER' && !permissions.includes('CURATOR_DASHBOARD')) {
      return 0;
    }

    if (role === 'ADMIN') {
      return this.prisma.submission.count({
        where: {
          OR: [
            { status: 'PENDING' },
            { status: 'GRADED', comment: { contains: '🤖 Автоматическая проверка' } },
          ],
        },
      });
    }

    if (role === 'CURATOR' || permissions.includes('CURATOR_DASHBOARD')) {
      const groups = await this.prisma.group.findMany({
        where: { curator_id: userId, is_public: false },
        select: {
          students: { select: { id: true } },
          courses: { select: { id: true } },
        },
      });
      const studentIds = [...new Set(groups.flatMap((g) => g.students.map((s) => s.id)))];
      const courseIds = [...new Set(groups.flatMap((g) => g.courses.map((c) => c.id)))];
      if (!studentIds.length || !courseIds.length) return 0;
      return this.prisma.submission.count({
        where: {
          user_id: { in: studentIds },
          lesson: { theme: { course_id: { in: courseIds } } },
          OR: [
            { status: 'PENDING' },
            { status: 'GRADED', comment: { contains: '🤖 Автоматическая проверка' } },
          ],
        },
      });
    }

    if (role === 'TEACHER') {
      return this.prisma.submission.count({
        where: {
          user: { groups: { some: { teacher_id: userId } } },
          lesson: { theme: { course: { groups: { some: { teacher_id: userId } } } } },
          OR: [
            { status: 'PENDING' },
            { status: 'GRADED', comment: { contains: '🤖 Автоматическая проверка' } },
          ],
        },
      });
    }

    return 0;
  }

  async getNotifications(userId: string) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [gradedCount, deadlines, todayEvents, flashcardStats, expiredAccess] = await Promise.all([
      this.prisma.submission.count({
        where: {
          user_id: userId,
          status: 'GRADED',
          updated_at: { gte: weekAgo },
        },
      }),
      this.prisma.event.findMany({
        where: {
          type: 'DEADLINE',
          date: { gte: tomorrowStart, lte: tomorrowEnd },
        },
        select: { id: true, title: true, date: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.event.findMany({
        where: {
          type: 'WEBINAR',
          date: { gte: todayStart, lte: todayEnd },
          NOT: { link: null },
        },
        select: { id: true, title: true, date: true, link: true },
        orderBy: { date: 'asc' },
      }),
      this.getFlashcardDueCount(userId),
      this.prisma.enrollment.findMany({
        where: {
          user_id: userId,
          expires_at: { not: null, lte: new Date() },
        },
        include: { course: { select: { id: true, title: true } } },
        take: 5,
      }),
    ]);

    const items: Array<{
      id: string;
      type: 'graded' | 'deadline' | 'cards' | 'access';
      text: string;
      sub?: string;
      link?: string;
    }> = [];

    if (gradedCount > 0) {
      items.push({
        id: 'graded',
        type: 'graded',
        text: `${gradedCount} домашних работ проверено`,
        sub: 'Посмотреть оценку',
        link: '/homework',
      });
    }

    deadlines.forEach((d) => {
      items.push({
        id: `dl-${d.id}`,
        type: 'deadline',
        text: `Дедлайн завтра: ${d.title}`,
        sub: new Date(d.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        link: '/schedule',
      });
    });

    todayEvents.forEach((e) => {
      items.push({
        id: `ev-${e.id}`,
        type: 'deadline',
        text: `Занятие сегодня: ${e.title}`,
        sub: `в ${new Date(e.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
        link: e.link || undefined,
      });
    });

    const cardsDue = flashcardStats.dueTodayCount + flashcardStats.newCount;
    if (cardsDue > 0) {
      items.push({
        id: 'cards',
        type: 'cards',
        text: `${cardsDue} карточек ждут повторения`,
        sub: 'Учить сейчас',
        link: '/flashcards',
      });
    }

    expiredAccess.forEach((e) => {
      items.push({
        id: `exp-${e.id}`,
        type: 'access',
        text: `Доступ истёк: ${e.course.title}`,
        sub: 'Прогресс сохранён. Обратитесь к куратору для продления',
        link: '/shop',
      });
    });

    return { items };
  }

  private async getFlashcardDueCount(userId: string) {
    const now = new Date();
    const [dueTodayCount, newCount] = await Promise.all([
      this.prisma.flashcardProgress.count({
        where: { user_id: userId, next_review_at: { lte: now } },
      }),
      this.prisma.flashcard.count({
        where: { progress: { none: { user_id: userId } } },
      }),
    ]);
    return { dueTodayCount, newCount: Math.min(newCount, 20) };
  }
}
