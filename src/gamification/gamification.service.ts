import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 86400000;

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  // Профиль геймификации: очки, уровень, стрик, достижения
  async getProfile(userId: string) {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, surname: true, avatar: true, points: true } as any,
    })) as any;

    if (!user) throw new NotFoundException('Пользователь не найден');

    const points: number = user.points || 0;

    const [gradedSubs, attempts] = await Promise.all([
      this.prisma.submission.findMany({
        where: { user_id: userId, status: 'GRADED' },
        select: { score: true, max_score: true, created_at: true },
      }),
      this.prisma.testAttempt.findMany({
        where: { user_id: userId },
        select: { score: true, created_at: true },
      }),
    ]);

    const completedCount = gradedSubs.length + attempts.length;
    const perfectCount =
      gradedSubs.filter((s) => s.score != null && s.max_score > 0 && s.score >= s.max_score).length +
      attempts.filter((a) => a.score >= 100).length;

    // Стрик активности (дни подряд)
    const dates = [
      ...gradedSubs.map((s) => new Date(s.created_at).setHours(0, 0, 0, 0)),
      ...attempts.map((a) => new Date(a.created_at).setHours(0, 0, 0, 0)),
    ];
    const streak = this.computeStreak(dates);

    const level = Math.floor(points / 100) + 1;
    const pointsIntoLevel = points % 100;

    const achievements = this.computeAchievements({ points, completedCount, perfectCount, streak });

    return {
      points,
      level,
      pointsIntoLevel,
      pointsPerLevel: 100,
      streak,
      completedCount,
      perfectCount,
      achievements,
    };
  }

  // Таблица лидеров: ученики группы(групп) пользователя по очкам
  async getLeaderboard(userId: string) {
    const groups = (await this.prisma.group.findMany({
      where: { students: { some: { id: userId } } },
      select: {
        students: { select: { id: true, name: true, surname: true, avatar: true, points: true } },
      } as any,
    })) as any[];

    const map = new Map<string, any>();
    for (const g of groups) {
      for (const s of g.students || []) map.set(s.id, s);
    }
    let students = Array.from(map.values());

    // Не состоит в группе — показываем общий топ студентов
    if (students.length === 0) {
      students = (await this.prisma.user.findMany({
        where: { role: 'STUDENT' as any },
        select: { id: true, name: true, surname: true, avatar: true, points: true } as any,
        orderBy: { points: 'desc' } as any,
        take: 20,
      })) as any[];
    }

    students.sort((a, b) => (b.points || 0) - (a.points || 0));

    return students.slice(0, 20).map((s, i) => ({
      rank: i + 1,
      id: s.id,
      name: s.name,
      surname: s.surname,
      avatar: s.avatar,
      points: s.points || 0,
      isMe: s.id === userId,
    }));
  }

  private computeStreak(timestamps: number[]): number {
    if (timestamps.length === 0) return 0;
    const unique = [...new Set(timestamps)].sort((a, b) => b - a);
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - DAY;

    let cursor = unique[0] === today ? today : unique[0] === yesterday ? yesterday : null;
    if (cursor === null) return 0;

    let streak = 1;
    for (let i = 1; i < unique.length; i++) {
      if (unique[i] === cursor - DAY) {
        streak++;
        cursor -= DAY;
      } else if (unique[i] === cursor) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  }

  private computeAchievements(stats: {
    points: number;
    completedCount: number;
    perfectCount: number;
    streak: number;
  }) {
    const defs = [
      { code: 'first_step', title: 'Первый шаг', description: 'Сдать первую работу', icon: '🎯', value: stats.completedCount, target: 1 },
      { code: 'ten_done', title: 'Десятка', description: 'Выполнить 10 заданий', icon: '📚', value: stats.completedCount, target: 10 },
      { code: 'fifty_done', title: 'Полтинник', description: 'Выполнить 50 заданий', icon: '🏆', value: stats.completedCount, target: 50 },
      { code: 'streak_3', title: 'В ритме', description: '3 дня подряд', icon: '🔥', value: stats.streak, target: 3 },
      { code: 'streak_7', title: 'Неделя в деле', description: '7 дней подряд', icon: '⚡', value: stats.streak, target: 7 },
      { code: 'perfect', title: 'Безупречно', description: 'Идеальный результат', icon: '💎', value: stats.perfectCount, target: 1 },
      { code: 'sniper', title: 'Снайпер', description: '5 идеальных результатов', icon: '🎖️', value: stats.perfectCount, target: 5 },
      { code: 'centurion', title: 'Сотка очков', description: 'Набрать 100 очков', icon: '🥉', value: stats.points, target: 100 },
      { code: 'pro', title: 'Профи', description: 'Набрать 500 очков', icon: '🥈', value: stats.points, target: 500 },
      { code: 'legend', title: 'Легенда', description: 'Набрать 1000 очков', icon: '🥇', value: stats.points, target: 1000 },
    ];

    return defs.map((d) => ({
      code: d.code,
      title: d.title,
      description: d.description,
      icon: d.icon,
      target: d.target,
      progress: Math.min(d.value, d.target),
      earned: d.value >= d.target,
    }));
  }
}
