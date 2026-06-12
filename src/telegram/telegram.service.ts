import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type TgButton = { text: string; callback_data: string };

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private prisma: PrismaService) {}

  private get token() {
    return process.env.TELEGRAM_BOT_TOKEN || '';
  }

  get botUsername() {
    return process.env.TELEGRAM_BOT_USERNAME || '';
  }

  get botUrl() {
    return this.botUsername ? `https://t.me/${this.botUsername}` : '';
  }

  private async callTelegram(method: string, body: any) {
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not set');
      return null;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        this.logger.warn(`Telegram ${method} failed: ${res.status} ${await res.text()}`);
      }
      return res;
    } catch (error) {
      this.logger.warn(`Telegram ${method} error: ${String(error)}`);
      return null;
    }
  }

  async sendMessage(chatId: string, text: string, buttons?: TgButton[][]) {
    return this.callTelegram('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
    });
  }

  async handleUpdate(update: any) {
    if (update.message) {
      const chatId = String(update.message.chat.id);
      const text = String(update.message.text || '').trim();
      return this.handleMessage(chatId, text);
    }

    if (update.callback_query) {
      const chatId = String(update.callback_query.message.chat.id);
      const data = String(update.callback_query.data || '');
      await this.callTelegram('answerCallbackQuery', { callback_query_id: update.callback_query.id });
      return this.handleCallback(chatId, data);
    }

    return { ok: true };
  }

  private async handleMessage(chatId: string, text: string) {
    const normalized = text.replace('/start', '').trim().toUpperCase();

    if (!normalized) {
      return this.sendMessage(
        chatId,
        'Привет! Отправьте сюда ваш универсальный код с сайта, чтобы привязать Telegram.\n\nКод находится в профиле ученика или в кабинете родителя.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { telegram_code: normalized },
      include: { children: true },
    });

    if (!user) {
      return this.sendMessage(chatId, 'Код не найден. Проверьте код на сайте и отправьте его ещё раз.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { telegram_chat_id: chatId, telegram_linked_at: new Date() },
    });

    const roleText = user.role === 'PARENT' ? 'родителя' : 'ученика';
    return this.sendMessage(
      chatId,
      `Готово! Telegram привязан к аккаунту ${roleText}: <b>${this.escapeHtml(this.userName(user))}</b>.\nТеперь сюда будут приходить уведомления об оценках.`,
      [[{ text: 'Открыть статистику', callback_data: 'stats' }]],
    );
  }

  private async handleCallback(chatId: string, data: string) {
    const user = await this.prisma.user.findFirst({
      where: { telegram_chat_id: chatId },
      include: { children: true },
    });

    if (!user) {
      return this.sendMessage(chatId, 'Сначала отправьте универсальный код с сайта.');
    }

    const student = await this.getTargetStudent(user);
    if (!student) {
      return this.sendMessage(chatId, 'К аккаунту не привязан ученик. Проверьте связь ребёнка в личном кабинете.');
    }

    if (data === 'stats') return this.sendCourses(chatId, student.id);
    if (data.startsWith('course:')) return this.sendCourseStats(chatId, student.id, data.slice('course:'.length));
    if (data.startsWith('theme:')) {
      return this.sendModuleStats(chatId, student.id, data.slice('theme:'.length));
    }

    return this.sendMessage(chatId, 'Не понял команду.');
  }

  async notifySubmissionGraded(submissionId: string, kind: 'written' | 'oral' = 'written') {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: { include: { parent: true } },
        lesson: { include: { theme: { include: { course: true } } } },
      },
    });

    if (!submission || submission.status !== 'GRADED') return;

    const student = submission.user;
    const recipients = [student, student.parent].filter(Boolean) as any[];
    const title = kind === 'oral' ? 'Выставлен балл за устный ответ' : 'Куратор проверил задание';
    const text =
      `<b>${title}</b>\n` +
      `Ученик: <b>${this.escapeHtml(this.userName(student))}</b>\n` +
      `Курс: ${this.escapeHtml(submission.lesson?.theme?.course?.title || 'Курс')}\n` +
      `Урок: ${this.escapeHtml(submission.lesson?.title || 'Урок')}\n\n` +
      `Балл: <b>${submission.score ?? 0}/${submission.max_score || 100}</b>\n` +
      `Комментарий: ${this.escapeHtml(submission.comment || 'Без комментария')}`;

    await Promise.all(
      recipients
        .filter((user) => user.telegram_chat_id)
        .map((user) => this.sendMessage(user.telegram_chat_id, text, [[{ text: 'Открыть статистику', callback_data: 'stats' }]])),
    );
  }

  async ensureTelegramCode(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    if (user.telegram_code) {
      return { code: user.telegram_code, botUrl: this.botUrl, linked: !!user.telegram_chat_id };
    }

    let code = '';
    for (let i = 0; i < 5; i++) {
      code = Math.random().toString(36).slice(2, 10).toUpperCase();
      const exists = await this.prisma.user.findUnique({ where: { telegram_code: code } });
      if (!exists) break;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { telegram_code: code },
    });

    return { code: updated.telegram_code, botUrl: this.botUrl, linked: !!updated.telegram_chat_id };
  }

  private userName(user: any) {
    return `${user?.surname || ''} ${user?.name || user?.email || 'Пользователь'}`.trim();
  }

  private escapeHtml(value: string) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private async getTargetStudent(user: any) {
    if (user.role === 'PARENT') return user.children?.[0] || null;
    return user;
  }

  private async sendCourses(chatId: string, studentId: string) {
    const courses = await this.prisma.course.findMany({
      where: { enrollments: { some: { user_id: studentId } } },
      include: { themes: { orderBy: { order_index: 'asc' } } },
      orderBy: { title: 'asc' },
    });

    if (!courses.length) return this.sendMessage(chatId, 'Пока нет курсов для статистики.');

    return this.sendMessage(
      chatId,
      'Выберите курс для статистики:',
      courses.map((course) => [{ text: course.title, callback_data: `course:${course.id}` }]),
    );
  }

  private async sendCourseStats(chatId: string, studentId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { themes: { orderBy: { order_index: 'asc' } } },
    });
    if (!course) return this.sendMessage(chatId, 'Курс не найден.');

    const stats = await this.calculateStats(studentId, courseId);
    const text = this.renderStatsText(`Курс: ${course.title}`, stats);
    const buttons = [
      ...(course.themes || []).map((theme) => [{ text: `Модуль: ${theme.title}`, callback_data: `theme:${theme.id}` }]),
      [{ text: 'Назад к курсам', callback_data: 'stats' }],
    ];
    return this.sendMessage(chatId, text, buttons);
  }

  private async sendModuleStats(chatId: string, studentId: string, moduleId: string) {
    const theme = await this.prisma.theme.findUnique({ where: { id: moduleId } });
    if (!theme) return this.sendMessage(chatId, 'Модуль не найден.');

    const stats = await this.calculateStats(studentId, theme.course_id, moduleId);
    const text = this.renderStatsText(`Модуль: ${theme.title}`, stats);
    return this.sendMessage(chatId, text, [
      [{ text: 'Назад к курсу', callback_data: `course:${theme.course_id}` }],
      [{ text: 'Все курсы', callback_data: 'stats' }],
    ]);
  }

  private async calculateStats(studentId: string, courseId: string, themeId?: string) {
    const submissions = await this.prisma.submission.findMany({
      where: {
        user_id: studentId,
        status: 'GRADED',
        lesson: {
          include_in_analytics: true,
          theme: {
            id: themeId || undefined,
            course_id: courseId,
          },
        },
      },
    });

    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        user_id: studentId,
        test: {
          theme: {
            id: themeId || undefined,
            course_id: courseId,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const buckets = {
      tests: { e: 0, m: 0 },
      written: { e: 0, m: 0 },
      oral: { e: 0, m: 0 },
    };

    submissions.forEach((sub) => {
      const blockId = String(sub.block_id || '');
      const type = blockId.startsWith('oral-')
        ? 'oral'
        : typeof sub.comment === 'string' && sub.comment.includes('Автоматическая проверка')
          ? 'tests'
          : 'written';
      buckets[type].e += sub.score || 0;
      buckets[type].m += sub.max_score || 100;
    });

    const latestAttempts = new Map<string, any>();
    attempts.forEach((attempt) => {
      if (!latestAttempts.has(attempt.test_id)) latestAttempts.set(attempt.test_id, attempt);
    });
    latestAttempts.forEach((attempt) => {
      buckets.tests.e += Math.min(100, Math.max(0, attempt.score || 0));
      buckets.tests.m += 100;
    });

    const percent = (e: number, m: number) => (m > 0 ? Math.round((e / m) * 100) : 0);
    const tests = percent(buckets.tests.e, buckets.tests.m);
    const written = percent(buckets.written.e, buckets.written.m);
    const oral = percent(buckets.oral.e, buckets.oral.m);
    const overall = Math.round((tests + written + oral) / 3);

    return { tests, written, oral, overall, count: submissions.length + latestAttempts.size };
  }

  private renderStatsText(title: string, stats: any) {
    const bar = (value: number) => {
      const filled = Math.round(value / 10);
      return '█'.repeat(filled) + '░'.repeat(10 - filled);
    };

    return (
      `<b>${this.escapeHtml(title)}</b>\n\n` +
      `Общая статистика: <b>${stats.overall}/100</b>\n${bar(stats.overall)}\n\n` +
      `Тесты: <b>${stats.tests}/100</b>\n${bar(stats.tests)}\n` +
      `Письменные: <b>${stats.written}/100</b>\n${bar(stats.written)}\n` +
      `Устные: <b>${stats.oral}/100</b>\n${bar(stats.oral)}\n\n` +
      `Учтено работ: ${stats.count}`
    );
  }
}
