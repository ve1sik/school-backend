import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

type TgButton = { text: string; callback_data: string };
type LinkStore = Record<string, { chatId: string; userId: string; linkedAt: string }>;

// Ответ, который мы возвращаем прямо в HTTP-ответ на webhook
// Telegram сам доставит его пользователю — без исходящих запросов с сервера
type WebhookReply = {
  method: string;
  chat_id: string | number;
  text?: string;
  parse_mode?: string;
  disable_web_page_preview?: boolean;
  reply_markup?: any;
  callback_query_id?: string;
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly linksPath = join(process.cwd(), 'telegram-links.json');

  constructor(private prisma: PrismaService) {}

  private get token() {
    return process.env.TELEGRAM_BOT_TOKEN || '';
  }

  get botUsername() {
    return process.env.TELEGRAM_BOT_USERNAME || 'prepodmgybot';
  }

  get botUrl() {
    return `https://t.me/${this.botUsername}`;
  }

  private loadLinks(): LinkStore {
    try {
      if (!existsSync(this.linksPath)) return {};
      return JSON.parse(readFileSync(this.linksPath, 'utf8')) || {};
    } catch {
      return {};
    }
  }

  private saveLinks(links: LinkStore) {
    writeFileSync(this.linksPath, JSON.stringify(links, null, 2));
  }

  private buildCode(userId: string) {
    return `TG${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  async ensureTelegramCode(userId: string) {
    const links = this.loadLinks();
    const code = this.buildCode(userId);
    return { code, botUrl: this.botUrl, linked: !!links[code] };
  }

  // Используется только для ПРОАКТИВНЫХ уведомлений (оценки от куратора)
  // Это отдельный исходящий вызов — работает если сервер имеет доступ к Telegram
  private async pushMessage(chatId: string, text: string, buttons?: TgButton[][]) {
    if (!this.token) return;
    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
      }, { timeout: 10000 });
    } catch (error: any) {
      this.logger.warn(`Push notification failed (network issue?): ${error?.message}`);
    }
  }

  // Обрабатывает входящий webhook и возвращает ответ прямо в HTTP-ответе
  // Telegram сам доставит ответ — исходящий запрос с сервера не нужен
  async handleUpdate(update: any): Promise<WebhookReply | { ok: true }> {
    if (update.message) {
      const chatId = String(update.message.chat.id);
      const text = String(update.message.text || '').trim();
      return this.handleMessage(chatId, text);
    }

    if (update.callback_query) {
      const chatId = String(update.callback_query.message.chat.id);
      const data = String(update.callback_query.data || '');
      const callbackId = update.callback_query.id;
      return this.handleCallback(chatId, data, callbackId);
    }

    return { ok: true };
  }

  private replyMessage(chatId: string, text: string, buttons?: TgButton[][]): WebhookReply {
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
    };
  }

  private async handleMessage(chatId: string, text: string): Promise<WebhookReply> {
    const normalized = text.replace('/start', '').trim().toUpperCase();

    if (!normalized) {
      return this.replyMessage(
        chatId,
        'Привет! Отправьте код Telegram с сайта, чтобы привязать аккаунт.\n\n<b>Где взять код:</b>\n• Ученик: Мой профиль → блок Telegram бот\n• Родитель: Кабинет родителя → блок Telegram бот',
      );
    }

    const user = await this.findUserByCode(normalized);
    if (!user) {
      return this.replyMessage(chatId, '❌ Код не найден. Проверьте код на сайте и отправьте его ещё раз.');
    }

    const links = this.loadLinks();
    links[normalized] = { chatId, userId: user.id, linkedAt: new Date().toISOString() };
    this.saveLinks(links);

    const roleText = user.role === 'PARENT' ? 'родителя' : 'ученика';
    return this.replyMessage(
      chatId,
      `✅ <b>Готово!</b> Telegram привязан к аккаунту ${roleText}: <b>${this.escapeHtml(this.userName(user))}</b>\n\nТеперь сюда будут приходить уведомления об оценках.`,
      [[{ text: '📊 Открыть статистику', callback_data: 'stats' }]],
    );
  }

  private async handleCallback(chatId: string, data: string, callbackId: string): Promise<WebhookReply> {
    const user = await this.findUserByChatId(chatId);
    if (!user) {
      return this.replyMessage(chatId, 'Сначала отправьте код Telegram с сайта.');
    }

    const student = user.role === 'PARENT'
      ? await this.prisma.user.findFirst({ where: { parent_id: user.id } })
      : user;

    if (!student) {
      return this.replyMessage(chatId, 'К аккаунту родителя пока не привязан ученик.');
    }

    if (data === 'stats') return this.buildCourseList(chatId, student.id);
    if (data.startsWith('course:')) return this.buildCourseStats(chatId, student.id, data.slice('course:'.length));
    if (data.startsWith('theme:')) return this.buildModuleStats(chatId, student.id, data.slice('theme:'.length));

    return this.replyMessage(chatId, 'Не понял команду.');
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

    const title = kind === 'oral' ? '🎤 Балл за устный ответ' : '📝 Куратор проверил задание';
    const text =
      `<b>${title}</b>\n` +
      `Ученик: <b>${this.escapeHtml(this.userName(submission.user))}</b>\n` +
      `Курс: ${this.escapeHtml(submission.lesson?.theme?.course?.title || '—')}\n` +
      `Урок: ${this.escapeHtml(submission.lesson?.title || '—')}\n\n` +
      `Балл: <b>${submission.score ?? 0} / ${submission.max_score || 100}</b>\n` +
      `Комментарий: ${this.escapeHtml(submission.comment || 'Без комментария')}`;

    const buttons: TgButton[][] = [[{ text: '📊 Посмотреть статистику', callback_data: 'stats' }]];

    const recipients = [submission.user, submission.user.parent].filter(Boolean) as any[];
    await Promise.all(
      recipients.map(async (user) => {
        const chatId = this.getChatIdForUser(user.id);
        if (chatId) await this.pushMessage(chatId, text, buttons);
      }),
    );
  }

  async testSend(chatId: string) {
    await this.pushMessage(chatId, '✅ Тест: backend успешно отправляет сообщения в Telegram.');
    return { ok: true };
  }

  private async findUserByCode(code: string) {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, name: true, surname: true, role: true },
    });
    return users.find((u) => this.buildCode(u.id) === code) || null;
  }

  private async findUserByChatId(chatId: string) {
    const link = Object.values(this.loadLinks()).find((item) => item.chatId === chatId);
    if (!link) return null;
    return this.prisma.user.findUnique({ where: { id: link.userId } });
  }

  private getChatIdForUser(userId: string) {
    const code = this.buildCode(userId);
    return this.loadLinks()[code]?.chatId || null;
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

  private async buildCourseList(chatId: string, studentId: string): Promise<WebhookReply> {
    const courses = await this.prisma.course.findMany({
      where: { enrollments: { some: { user_id: studentId } } },
      orderBy: { title: 'asc' },
    });

    if (!courses.length) return this.replyMessage(chatId, 'Пока нет курсов для статистики.');

    return this.replyMessage(
      chatId,
      'Выберите курс для просмотра статистики:',
      courses.map((course) => [{ text: course.title, callback_data: `course:${course.id}` }]),
    );
  }

  private async buildCourseStats(chatId: string, studentId: string, courseId: string): Promise<WebhookReply> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { themes: { orderBy: { order_index: 'asc' } } },
    });
    if (!course) return this.replyMessage(chatId, 'Курс не найден.');

    const stats = await this.calculateStats(studentId, courseId);
    const buttons: TgButton[][] = [
      ...(course.themes || []).map((theme) => [{ text: `📖 ${theme.title}`, callback_data: `theme:${theme.id}` }]),
      [{ text: '← Назад к курсам', callback_data: 'stats' }],
    ];
    return this.replyMessage(chatId, this.renderStats(`Курс: ${course.title}`, stats), buttons);
  }

  private async buildModuleStats(chatId: string, studentId: string, themeId: string): Promise<WebhookReply> {
    const theme = await this.prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) return this.replyMessage(chatId, 'Модуль не найден.');

    const stats = await this.calculateStats(studentId, theme.course_id, themeId);
    return this.replyMessage(chatId, this.renderStats(`Модуль: ${theme.title}`, stats), [
      [{ text: '← Назад к курсу', callback_data: `course:${theme.course_id}` }],
      [{ text: '← Все курсы', callback_data: 'stats' }],
    ]);
  }

  private async calculateStats(studentId: string, courseId: string, themeId?: string) {
    const submissions = await this.prisma.submission.findMany({
      where: {
        user_id: studentId,
        status: 'GRADED',
        lesson: { theme: { id: themeId || undefined, course_id: courseId } },
      },
    });

    const buckets = { tests: { e: 0, m: 0 }, written: { e: 0, m: 0 }, oral: { e: 0, m: 0 } };

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

    const pct = (e: number, m: number) => (m > 0 ? Math.round((e / m) * 100) : 0);
    const tests = pct(buckets.tests.e, buckets.tests.m);
    const written = pct(buckets.written.e, buckets.written.m);
    const oral = pct(buckets.oral.e, buckets.oral.m);

    return { tests, written, oral, overall: Math.round((tests + written + oral) / 3), count: submissions.length };
  }

  private renderStats(title: string, s: any) {
    const bar = (v: number) => '█'.repeat(Math.round(v / 10)) + '░'.repeat(10 - Math.round(v / 10));
    return (
      `<b>${this.escapeHtml(title)}</b>\n\n` +
      `📊 Общий балл: <b>${s.overall}/100</b>\n${bar(s.overall)}\n\n` +
      `🔵 Тесты:       <b>${s.tests}/100</b>\n${bar(s.tests)}\n` +
      `🟡 Письменные: <b>${s.written}/100</b>\n${bar(s.written)}\n` +
      `🟢 Устные:      <b>${s.oral}/100</b>\n${bar(s.oral)}\n\n` +
      `Учтено работ: ${s.count}`
    );
  }
}
