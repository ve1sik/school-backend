import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

type TgButton = { text: string; callback_data: string };
type LinkStore = Record<string, { chatId?: string; userId: string; linkedAt?: string; preparedAt?: string }>;
type PushJob = {
  chatId: string;
  text: string;
  extra?: { buttons?: TgButton[][]; keyboard?: boolean };
  attempt: number;
};

// Структура прямого ответа Telegram через webhook
type WebhookReply =
  | { method: 'sendMessage'; chat_id: string | number; text: string; parse_mode: string; disable_web_page_preview: boolean; reply_markup?: any }
  | { ok: true };

// Постоянная клавиатура (внизу экрана Telegram)
const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: '📊 Статистика' },   { text: '📅 Дедлайны' }],
    [{ text: '👤 Мой профиль' },  { text: '📚 Мои курсы' }],
    [{ text: '🔔 Уведомления' },  { text: '🔄 Перезапустить' }],
    [{ text: '❓ Помощь' }],
  ],
  resize_keyboard: true,
  persistent: true,
  one_time_keyboard: false,
};

const AUTO_PREFIX = 'Автоматическая проверка';

// ─────────────── Форматирование ───────────────
const esc = (v: any) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const bar = (v: number, len = 10) => {
  const filled = Math.min(len, Math.round((v / 100) * len));
  return '▓'.repeat(filled) + '░'.repeat(len - filled);
};

const medal = (v: number) => v >= 90 ? '🥇' : v >= 75 ? '🥈' : v >= 50 ? '🥉' : '❗';
const trend = (v: number) => v >= 80 ? '📈' : v >= 50 ? '➡️' : '📉';

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

const daysLeft = (d: Date | string) => {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return '⛔ просрочен';
  if (diff === 0) return '🔥 сегодня!';
  if (diff === 1) return '⚠️ завтра';
  if (diff <= 3)  return `⚠️ через ${diff} дн.`;
  return `через ${diff} дн.`;
};

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private readonly linksPath = join(process.cwd(), 'telegram-links.json');
  private readonly webhookTimeoutMs = 800;
  private readonly cacheTtlMs = 60 * 1000;
  private readonly pushQueue: PushJob[] = [];
  private pushProcessing = false;
  private lastPushError: string | null = null;
  private pushStats = { queued: 0, sent: 0, failed: 0 };
  private _replyCache = new Map<string, { exp: number; reply: WebhookReply }>();

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Напоминания каждый день в 9:00
    const scheduleDaily = () => {
      const now = new Date();
      const next9 = new Date(now);
      next9.setHours(9, 0, 0, 0);
      if (next9 <= now) next9.setDate(next9.getDate() + 1);
      setTimeout(() => {
        this.sendDeadlineReminders().catch((e) => this.logger.error(e));
        setInterval(() => this.sendDeadlineReminders().catch((e) => this.logger.error(e)), 24 * 3600 * 1000);
      }, next9.getTime() - now.getTime());
    };
    scheduleDaily();
    setInterval(() => this.processPushQueue().catch((e) => this.logger.warn(e?.message)), 300);
    // Регистрируем команды бота
    this.registerBotCommands().catch(() => {});
  }

  // ─────────────── Config ───────────────

  private get token() { return process.env.TELEGRAM_BOT_TOKEN || ''; }
  get botUsername() { return process.env.TELEGRAM_BOT_USERNAME || 'prepodmgybot'; }
  get botUrl() { return `https://t.me/${this.botUsername}`; }

  async registerBotCommands() {
    if (!this.token) return;
    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/setMyCommands`, {
        commands: [
          { command: 'start',     description: '🏠 Начало / главное меню' },
          { command: 'restart',   description: '🔄 Перезапустить бота' },
          { command: 'stats',     description: '📊 Статистика по курсам' },
          { command: 'deadlines', description: '📅 Ближайшие дедлайны' },
          { command: 'profile',   description: '👤 Мой профиль' },
          { command: 'courses',   description: '📚 Список моих курсов' },
          { command: 'help',      description: '❓ Помощь' },
        ],
      }, { timeout: 8000 });
      await axios.post(`https://api.telegram.org/bot${this.token}/setMyDescription`, {
        description: 'Бот школы «Препод из МГУ»: аналитика, оценки, дедлайны и уведомления от куратора.',
      }, { timeout: 8000 });
      await axios.post(`https://api.telegram.org/bot${this.token}/setChatMenuButton`, {
        menu_button: { type: 'commands' },
      }, { timeout: 8000 });
    } catch { /* не критично */ }
  }

  // ─────────────── Link store (читается один раз, хранится в памяти) ───────────────

  private _links: LinkStore | null = null;

  private loadLinks(): LinkStore {
    if (this._links) return this._links;
    try {
      if (!existsSync(this.linksPath)) { this._links = {}; return {}; }
      this._links = JSON.parse(readFileSync(this.linksPath, 'utf8')) || {};
      return this._links!;
    } catch { this._links = {}; return {}; }
  }

  private saveLinks(links: LinkStore) {
    this._links = links;
    writeFileSync(this.linksPath, JSON.stringify(links, null, 2));
  }

  private buildCode(userId: string) {
    return `TG${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  async ensureTelegramCode(userId: string) {
    const code = this.buildCode(userId);
    const links = this.loadLinks();
    if (!links[code]) {
      links[code] = { userId, preparedAt: new Date().toISOString() };
      this.saveLinks(links);
    }
    return { code, botUrl: this.botUrl, linked: !!this.loadLinks()[code]?.chatId };
  }

  private getChatIdForUser(userId: string) {
    return this.loadLinks()[this.buildCode(userId)]?.chatId || null;
  }

  // ─────────────── In-memory user cache (TTL 5 мин) ───────────────

  private _userCache = new Map<string, { user: any; exp: number }>();

  private async cachedUser(userId: string) {
    const now = Date.now();
    const hit = this._userCache.get(userId);
    if (hit && hit.exp > now) return hit.user;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { parent: true },
    });
    if (user) this._userCache.set(userId, { user, exp: now + 5 * 60 * 1000 });
    return user;
  }

  private invalidateCache(userId: string) {
    this._userCache.delete(userId);
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private getCachedReply(key: string): WebhookReply | null {
    const hit = this._replyCache.get(key);
    if (!hit) return null;
    if (hit.exp < Date.now()) {
      this._replyCache.delete(key);
      return null;
    }
    return hit.reply;
  }

  private setCachedReply(key: string, reply: WebhookReply, ttlMs = this.cacheTtlMs) {
    this._replyCache.set(key, { reply, exp: Date.now() + ttlMs });
    return reply;
  }

  private invalidateStudentReplyCache(studentId: string) {
    for (const key of Array.from(this._replyCache.keys())) {
      if (key.includes(`:${studentId}`)) this._replyCache.delete(key);
    }
  }

  // ─────────────── Поиск пользователя по коду (без full-scan) ───────────────
  // Код = TG + первые 8 hex-символов UUID (до первого дефиса)
  // UUID формат: xxxxxxxx-xxxx-... → prefix = 8 символов

  private async findUserByCode(code: string) {
    // Сначала смотрим в уже сохранённых ссылках — если пользователь уже привязан
    const existing = this.loadLinks()[code];
    if (existing) {
      return this.cachedUser(existing.userId)
        .catch(() => ({ id: existing.userId, role: 'STUDENT', name: 'Пользователь' }));
    }

    // Иначе ищем по prefix UUID: TG + 8 символов = первые 8 hex UUID
    const uuidPrefix = code.slice(2).toLowerCase(); // 8 символов
    const candidates = await this.withTimeout(
      this.prisma.user.findMany({
        where: { id: { startsWith: uuidPrefix } },
        select: { id: true, email: true, name: true, surname: true, role: true },
        take: 3,
      }),
      1200,
      [],
    );
    return candidates.find((u) => this.buildCode(u.id) === code) || null;
  }

  private async findUserByChatId(chatId: string) {
    const link = Object.values(this.loadLinks()).find((l) => l.chatId === chatId);
    if (!link) return null;
    return this.cachedUser(link.userId);
  }

  // ─────────────── Telegram API ───────────────

  private async pushMessage(chatId: string, text: string, extra?: { buttons?: TgButton[][]; keyboard?: boolean }) {
    if (!this.token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN is empty' };
    const reply_markup = extra?.buttons
      ? { inline_keyboard: extra.buttons }
      : extra?.keyboard
        ? MAIN_KEYBOARD
        : undefined;
    try {
      const res = await axios.post(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup,
        },
        { timeout: 1200 },
      );
      return { ok: true, status: res.status };
    } catch (e: any) {
      const error = e?.response?.data?.description || e?.code || e?.message || 'unknown';
      this.logger.warn(`Telegram push failed for chat ${chatId}: ${error}`);
      return { ok: false, error };
    }
  }

  private enqueuePush(chatId: string, text: string, extra?: { buttons?: TgButton[][]; keyboard?: boolean }) {
    this.pushQueue.push({ chatId, text, extra, attempt: 0 });
    this.pushStats.queued += 1;
  }

  private async processPushQueue() {
    if (this.pushProcessing || this.pushQueue.length === 0) return;
    this.pushProcessing = true;
    try {
      const job = this.pushQueue.shift();
      if (!job) return;
      const result = await this.pushMessage(job.chatId, job.text, job.extra);
      if (result.ok) {
        this.pushStats.sent += 1;
        return;
      }

      this.lastPushError = String(result.error || 'unknown');
      if (job.attempt < 2) {
        this.pushQueue.push({ ...job, attempt: job.attempt + 1 });
      } else {
        this.pushStats.failed += 1;
      }
    } finally {
      this.pushProcessing = false;
    }
  }

  private reply(chatId: string, text: string, extra?: { buttons?: TgButton[][]; keyboard?: boolean }): WebhookReply {
    const reply_markup = extra?.buttons
      ? { inline_keyboard: extra.buttons }
      : extra?.keyboard !== false
        ? MAIN_KEYBOARD
        : undefined;
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup,
    };
  }

  private async answerCbq(callbackQueryId: string) {
    if (!this.token) return;
    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/answerCallbackQuery`,
        { callback_query_id: callbackQueryId }, { timeout: 5000 });
    } catch { /* не критично */ }
  }

  // ─────────────── Webhook entry ───────────────

  async handleUpdate(update: any): Promise<WebhookReply> {
    const chatId = String(update?.message?.chat?.id || update?.callback_query?.message?.chat?.id || '');
    const work = (async () => {
      try {
        if (update.message) {
          return await this.handleMessage(
            String(update.message.chat.id),
            String(update.message.text || '').trim(),
          );
        }
        if (update.callback_query) {
          this.answerCbq(update.callback_query.id);
          return await this.handleCallback(
            String(update.callback_query.message.chat.id),
            String(update.callback_query.data || ''),
          );
        }
      } catch (e: any) {
        this.logger.error(`handleUpdate error: ${e?.message}`);
      }
      return { ok: true } as WebhookReply;
    })();

    const fallback = chatId
      ? this.reply(
          chatId,
          '⏳ <b>Данные подгружаются.</b>\n\nНажмите кнопку ещё раз через секунду. Я не завис, просто база отвечает дольше обычного.',
        )
      : ({ ok: true } as WebhookReply);

    return this.withTimeout(work, this.webhookTimeoutMs, fallback);
  }

  // ─────────────── Message router ───────────────

  private async handleMessage(chatId: string, text: string): Promise<WebhookReply> {
    const clean = text.trim();
    const cmd = clean.replace(/^\/(\w+).*/, '$1').toLowerCase();

    // Команды
    if (cmd === 'start' || cmd === 'restart') return this.handleStart(chatId, clean);
    if (cmd === 'stats')     return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
    if (cmd === 'deadlines') return this.requireLinked(chatId, (s) => this.showDeadlines(chatId, s.id));
    if (cmd === 'profile')   return this.requireLinked(chatId, (s) => this.showProfile(chatId, s));
    if (cmd === 'courses')   return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
    if (cmd === 'help')      return this.showHelp(chatId);

    // Кнопки постоянной клавиатуры
    if (text === '📊 Статистика')   return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
    if (text === '📅 Дедлайны')     return this.requireLinked(chatId, (s) => this.showDeadlines(chatId, s.id));
    if (text === '👤 Мой профиль')  return this.requireLinked(chatId, (s) => this.showProfile(chatId, s));
    if (text === '📚 Мои курсы')    return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
    if (text === '🔔 Уведомления')  return this.requireLinked(chatId, (s) => this.showNotifSettings(chatId));
    if (text === '🔄 Перезапустить') return this.handleStart(chatId, '/start');
    if (text === '❓ Помощь')        return this.showHelp(chatId);

    // Попытка ввести код привязки
    const codeMatch = clean.match(/^(?:\/start\s+)?([A-Z0-9]{10,16})$/);
    if (codeMatch) return this.handleLinkCode(chatId, codeMatch[1].toUpperCase());

    return this.handleStart(chatId, clean);
  }

  private async handleCallback(chatId: string, data: string): Promise<WebhookReply> {
    const linked = await this.findUserByChatId(chatId);
    if (!linked) return this.reply(chatId, '⚠️ Сначала отправьте Telegram-код с сайта.');

    const student = linked.role === 'PARENT'
      ? await this.prisma.user.findFirst({ where: { parent_id: linked.id }, select: { id: true, name: true, surname: true, email: true, role: true } })
      : linked;
    if (!student) return this.reply(chatId, 'К аккаунту родителя пока не привязан ученик.\n\nОткройте «Кабинет родителя» на сайте.');

    if (data === 'stats')     return this.showCourseList(chatId, student.id);
    if (data === 'deadlines') return this.showDeadlines(chatId, student.id);
    if (data === 'home')      return this.showHome(chatId, linked, student);
    if (data === 'profile')   return this.showProfile(chatId, student);
    if (data === 'courses')   return this.showCourseList(chatId, student.id);
    if (data.startsWith('course:'))  return this.showCourseStats(chatId, student.id, data.slice(7));
    if (data.startsWith('theme:'))   return this.showThemeStats(chatId, student.id, data.slice(6));

    return this.reply(chatId, '❓ Не понял команду. Используйте кнопки меню.');
  }

  // ─────────────── Helpers ───────────────

  private async requireLinked(chatId: string, fn: (student: any) => Promise<WebhookReply>): Promise<WebhookReply> {
    const linked = await this.findUserByChatId(chatId);
    if (!linked) return this.sendWelcome(chatId);
    const student = linked.role === 'PARENT'
      ? await this.prisma.user.findFirst({ where: { parent_id: linked.id }, select: { id: true, name: true, surname: true, email: true, role: true } })
      : linked;
    if (!student) return this.reply(chatId, 'К аккаунту родителя пока не привязан ученик.');
    return fn(student);
  }

  private async resolveStudent(user: any) {
    if (user.role !== 'PARENT') return user;
    return this.prisma.user.findFirst({ where: { parent_id: user.id } });
  }

  private userName(u: any) {
    return `${u?.surname ?? ''} ${u?.name ?? u?.email ?? 'Пользователь'}`.trim();
  }

  private _coursesCache = new Map<string, { courses: any[]; exp: number }>();

  // Все курсы ученика: прямые энролменты + через группы (кэш 3 мин)
  private async getStudentCourses(studentId: string) {
    const now = Date.now();
    const hit = this._coursesCache.get(studentId);
    if (hit && hit.exp > now) return hit.courses;

    const [enrollments, groups] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { user_id: studentId },
        include: { course: true },
      }),
      this.prisma.group.findMany({
        where: { students: { some: { id: studentId } } },
        include: { courses: true },
      }),
    ]);

    const map = new Map<string, any>();
    enrollments.forEach((e) => map.set(e.course_id, e.course));
    groups.forEach((g) => g.courses.forEach((c) => map.set(c.id, c)));
    const courses = Array.from(map.values());
    this._coursesCache.set(studentId, { courses, exp: now + 3 * 60 * 1000 });
    return courses;
  }

  // ─────────────── Экраны ───────────────

  private sendWelcome(chatId: string): WebhookReply {
    return this.reply(
      chatId,
      '👋 <b>Привет! Я бот школы «Препод из МГУ».</b>\n\n' +
      'Я помогу вам:\n' +
      '📊 Смотреть статистику и оценки\n' +
      '📅 Следить за дедлайнами\n' +
      '🔔 Получать уведомления от куратора\n\n' +
      '📌 <b>Чтобы начать — введите ваш Telegram-код.</b>\n' +
      'Код находится:\n' +
      '• Ученик → <b>Мой профиль</b> → блок «Telegram бот»\n' +
      '• Родитель → <b>Кабинет родителя</b> → блок «Telegram бот»',
    );
  }

  private async handleStart(chatId: string, text: string): Promise<WebhookReply> {
    // /start CODE — deep link привязка
    const deepCode = text.replace('/start', '').trim().toUpperCase();
    if (deepCode && deepCode.startsWith('TG')) {
      return this.handleLinkCode(chatId, deepCode);
    }

    const linked = Object.values(this.loadLinks()).some((l) => l.chatId === chatId);
    if (!linked) return this.sendWelcome(chatId);

    return this.showHomeLite(chatId);
  }

  private showHomeLite(chatId: string): WebhookReply {
    return this.reply(
      chatId,
      `🏠 <b>Главное меню</b>\n${'─'.repeat(26)}\n\n` +
      `Бот готов к работе.\n\n` +
      `📊 <b>Статистика</b> — оценки по курсам\n` +
      `📅 <b>Дедлайны</b> — ближайшие сроки\n` +
      `👤 <b>Мой профиль</b> — данные аккаунта\n` +
      `🔔 <b>Уведомления</b> — что приходит в Telegram\n\n` +
      `Используйте постоянное меню снизу 👇`,
    );
  }

  private async handleLinkCode(chatId: string, code: string): Promise<WebhookReply> {
    const links = this.loadLinks();
    const prepared = links[code];

    // Самый быстрый путь: сайт уже подготовил код через /telegram/link-code.
    // Тут не ходим в БД вообще, чтобы Telegram получил ответ мгновенно.
    if (prepared) {
      links[code] = { ...prepared, chatId, linkedAt: new Date().toISOString() };
      this.saveLinks(links);
      this.invalidateCache(prepared.userId);

      return this.reply(
        chatId,
        `✅ <b>Telegram подключён!</b>\n\n` +
        `Теперь бот будет присылать оценки, дедлайны и уведомления от куратора.\n\n` +
        `Постоянное меню уже внизу экрана 👇\n` +
        `Нажмите <b>📊 Статистика</b>, <b>📅 Дедлайны</b> или <b>👤 Мой профиль</b>.`,
      );
    }

    const user = await this.findUserByCode(code);
    if (!user) {
      return this.reply(chatId,
        '❌ <b>Код не найден или ещё не подготовлен сайтом.</b>\n\n' +
        'Откройте профиль на сайте, дождитесь блока Telegram и отправьте код ещё раз.',
      );
    }

    links[code] = { chatId, userId: user.id, linkedAt: new Date().toISOString() };
    this.saveLinks(links);
    this.invalidateCache(user.id);

    const roleLabel = user.role === 'PARENT' ? 'Родитель' : 'Ученик';
    return this.reply(
      chatId,
      `✅ <b>Аккаунт успешно привязан!</b>\n\n` +
      `${roleLabel}: <b>${esc(this.userName(user))}</b>\n` +
      `\nТеперь вам будут приходить уведомления об оценках и напоминания о дедлайнах.\n\n` +
      `Постоянное меню уже внизу экрана 👇\n\n` +
      `Нажмите <b>📊 Статистика</b> или <b>👤 Мой профиль</b>.`,
    );
  }

  private async showHome(chatId: string, linked: any, student: any): Promise<WebhookReply> {
    if (!student) return this.reply(chatId, 'Добро пожаловать! Используйте меню ниже.');

    // Параллельно: общий балл + ближайший дедлайн
    const courses = await this.getStudentCourses(student.id);
    const summary = courses.length
      ? await this.buildOverallSummary(student.id, courses.map((c) => c.id))
      : { overall: 0 };

    const deadline = await this.getAnyNearestDeadline(student.id);

    let text = `🏠 <b>Главное меню</b>\n${'─'.repeat(26)}\n\n`;
    text += `👤 <b>${esc(this.userName(student))}</b>\n`;
    text += courses.length ? `📚 Курсов: <b>${courses.length}</b>\n` : '';

    if (courses.length) {
      text += `\n${medal(summary.overall)} <b>Общий балл: ${summary.overall}/100</b>\n`;
      text += `${bar(summary.overall)}\n`;
    }

    if (deadline) {
      text += `\n⏰ <b>Ближайший дедлайн:</b>\n${esc(deadline.title)} — ${daysLeft(deadline.date)}\n`;
    }

    text += `\nВыберите раздел из меню ниже 👇`;

    return this.reply(chatId, text, {
      buttons: [
        [{ text: '📊 Статистика', callback_data: 'stats' }, { text: '📅 Дедлайны', callback_data: 'deadlines' }],
      ],
    });
  }

  private async showHelp(chatId: string): Promise<WebhookReply> {
    return this.reply(chatId,
      `❓ <b>Помощь</b>\n${'─'.repeat(26)}\n\n` +
      `<b>Команды:</b>\n` +
      `/start — главное меню\n` +
      `/stats — статистика\n` +
      `/deadlines — дедлайны\n` +
      `/profile — мой профиль\n` +
      `/courses — список курсов\n` +
      `/help — эта справка\n\n` +
      `<b>Или используйте кнопки меню</b> — они всегда внизу экрана.\n\n` +
      `Если бот завис — нажмите /start для сброса.`,
    );
  }

  private async showNotifSettings(chatId: string): Promise<WebhookReply> {
    return this.reply(chatId,
      `🔔 <b>Уведомления включены</b>\n\n` +
      `Вы получаете уведомления:\n` +
      `✅ Когда куратор проверил задание\n` +
      `✅ Когда выставлен балл за устный ответ\n` +
      `✅ Напоминания о дедлайнах (каждый день в 9:00)\n\n` +
      `Уведомления работают автоматически, пока ваш аккаунт привязан.`,
    );
  }

  private async showProfile(chatId: string, student: any): Promise<WebhookReply> {
    const cacheKey = `profile:${chatId}:${student.id}`;
    const cached = this.getCachedReply(cacheKey);
    if (cached) return cached;

    const [courses, groups, subs, attempts] = await Promise.all([
      this.getStudentCourses(student.id),
      this.prisma.group.findMany({
        where: { students: { some: { id: student.id } } },
        select: { title: true },
      }),
      this.prisma.submission.count({ where: { user_id: student.id, status: 'GRADED' } }),
      this.prisma.testAttempt.count({ where: { user_id: student.id } }),
    ]);

    const summary = courses.length
      ? await this.buildOverallSummary(student.id, courses.map((c) => c.id))
      : { overall: 0 };

    const streakDays = await this.calcStreak(student.id);

    let text =
      `👤 <b>${esc(this.userName(student))}</b>\n` +
      `${'─'.repeat(28)}\n\n` +
      `📚 Курсов: <b>${courses.length}</b>\n` +
      (groups.length ? `👥 Групп: <b>${groups.map((g) => g.title).join(', ')}</b>\n` : '') +
      `\n${medal(summary.overall)} <b>Общий балл: ${summary.overall}/100</b>\n` +
      `${bar(summary.overall)}\n\n` +
      `📝 Работ проверено: <b>${subs}</b>\n` +
      `🧩 Тестов пройдено: <b>${attempts}</b>\n` +
      (streakDays > 0 ? `🔥 Стрик: <b>${streakDays} дн.</b> подряд\n` : '');

    return this.setCachedReply(cacheKey, this.reply(chatId, text, {
      buttons: [
        [{ text: '📊 Статистика', callback_data: 'stats' }],
        [{ text: '📅 Дедлайны', callback_data: 'deadlines' }],
      ],
    }));
  }

  // ─────────────── Курсы ───────────────

  private async showCourseList(chatId: string, studentId: string): Promise<WebhookReply> {
    const cacheKey = `courses:${chatId}:${studentId}`;
    const cached = this.getCachedReply(cacheKey);
    if (cached) return cached;

    const courses = await this.getStudentCourses(studentId);

    if (!courses.length) {
      return this.reply(chatId, '📚 Вы пока не записаны ни на один курс.\n\nОткройте магазин на сайте и подайте заявку на вступление в группу.');
    }

    // Параллельно считаем статистику по всем курсам
    const statsArr = await Promise.all(courses.map((c) => this.calcStats(studentId, c.id)));
    const summary = statsArr.reduce((acc, s) => acc + s.overall, 0);
    const avg = Math.round(summary / statsArr.length);

    let text =
      `📚 <b>Мои курсы</b>  ${trend(avg)}\n` +
      `${'─'.repeat(28)}\n\n` +
      `${medal(avg)} <b>Средний балл: ${avg}/100</b>\n` +
      `${bar(avg)}\n\n` +
      `<b>Выберите курс:</b>`;

    const buttons: TgButton[][] = courses.map((c, i) => {
      const s = statsArr[i];
      const emoji = s.overall >= 75 ? '🟢' : s.overall >= 50 ? '🟡' : s.count > 0 ? '🔴' : '⬜';
      return [{ text: `${emoji} ${c.title} — ${s.overall}/100`, callback_data: `course:${c.id}` }];
    });
    buttons.push([{ text: '📅 Дедлайны', callback_data: 'deadlines' }]);

    return this.setCachedReply(cacheKey, this.reply(chatId, text, { buttons }));
  }

  // ─────────────── Статистика курса ───────────────

  private async showCourseStats(chatId: string, studentId: string, courseId: string): Promise<WebhookReply> {
    const cacheKey = `course:${chatId}:${studentId}:${courseId}`;
    const cached = this.getCachedReply(cacheKey);
    if (cached) return cached;

    const [course, stats, deadline] = await Promise.all([
      this.prisma.course.findUnique({
        where: { id: courseId },
        include: { themes: { where: { is_visible: true }, orderBy: { order_index: 'asc' } } },
      }),
      this.calcStats(studentId, courseId),
      this.getNearestCourseDeadline(courseId),
    ]);
    if (!course) return this.reply(chatId, 'Курс не найден.');

    const t = (n: number) => `${bar(n, 8)} <b>${n}</b>/100`;

    let text =
      `📖 <b>${esc(course.title)}</b>\n` +
      `${'─'.repeat(28)}\n\n` +
      `${medal(stats.overall)} <b>Общий балл: ${stats.overall}/100</b>\n` +
      `${bar(stats.overall)} ${trend(stats.overall)}\n\n` +
      `🔵 Тесты         ${t(stats.tests)}\n` +
      `🟡 Письменные   ${t(stats.written)}\n` +
      `🟢 Устные        ${t(stats.oral)}\n\n` +
      `📋 Проверено работ: <b>${stats.count}</b>`;

    if (deadline) {
      text += `\n\n⏰ <b>Ближайший дедлайн:</b>\n${esc(deadline.title)} — ${daysLeft(deadline.date)}`;
    }

    const themeButtons: TgButton[][] = (course.themes || []).map((t) => [
      { text: `📌 ${t.title}`, callback_data: `theme:${t.id}` },
    ]);
    themeButtons.push(
      [{ text: '📅 Все дедлайны курса', callback_data: 'deadlines' }],
      [{ text: '← Все курсы', callback_data: 'stats' }],
    );

    return this.setCachedReply(cacheKey, this.reply(chatId, text, { buttons: themeButtons }));
  }

  // ─────────────── Статистика модуля ───────────────

  private async showThemeStats(chatId: string, studentId: string, themeId: string): Promise<WebhookReply> {
    const cacheKey = `theme:${chatId}:${studentId}:${themeId}`;
    const cached = this.getCachedReply(cacheKey);
    if (cached) return cached;

    const [theme, stats] = await Promise.all([
      this.prisma.theme.findUnique({
        where: { id: themeId },
        include: { lessons: { where: { is_visible: true }, orderBy: { order_index: 'asc' } } },
      }),
      this.calcStats(studentId, undefined, themeId),
    ]);
    if (!theme) return this.reply(chatId, 'Модуль не найден.');

    const lessonBreakdown = await this.getLessonBreakdown(studentId, themeId);
    const t = (n: number) => `${bar(n, 8)} <b>${n}</b>/100`;

    let text =
      `📌 <b>${esc(theme.title)}</b>\n` +
      `${'─'.repeat(28)}\n\n` +
      `${medal(stats.overall)} <b>Балл по модулю: ${stats.overall}/100</b>\n` +
      `${bar(stats.overall)}\n\n` +
      `🔵 Тесты         ${t(stats.tests)}\n` +
      `🟡 Письменные   ${t(stats.written)}\n` +
      `🟢 Устные        ${t(stats.oral)}\n`;

    if (lessonBreakdown.length) {
      text += `\n<b>Уроки (${lessonBreakdown.filter((l) => l.done).length}/${lessonBreakdown.length} ✅):</b>\n`;
      for (const ls of lessonBreakdown) {
        const icon = ls.done ? '✅' : '⬜';
        text += `${icon} ${esc(ls.title)}`;
        if (ls.deadline) text += `  <i>${daysLeft(ls.deadline)}</i>`;
        text += '\n';
      }
    }

    if (theme.deadline) {
      text += `\n⏰ Дедлайн модуля: <b>${fmtDate(theme.deadline)}</b> — ${daysLeft(theme.deadline)}`;
    }

    return this.setCachedReply(cacheKey, this.reply(chatId, text, {
      buttons: [
        [{ text: `← Назад к курсу`, callback_data: `course:${theme.course_id}` }],
        [{ text: '← Все курсы', callback_data: 'stats' }],
      ],
    }));
  }

  // ─────────────── Дедлайны ───────────────

  private async showDeadlines(chatId: string, studentId: string): Promise<WebhookReply> {
    const cacheKey = `deadlines:${chatId}:${studentId}`;
    const cached = this.getCachedReply(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const inTwoWeeks = new Date(now.getTime() + 14 * 86400000);

    const courses = await this.getStudentCourses(studentId);
    const courseIds = courses.map((c) => c.id);

    const [groups, lessons, themes] = await Promise.all([
      this.prisma.group.findMany({
        where: { students: { some: { id: studentId } } },
        select: { id: true },
      }),
      courseIds.length ? this.prisma.lesson.findMany({
        where: { deadline: { gte: now, lte: inTwoWeeks }, is_visible: true, theme: { course_id: { in: courseIds } } },
        include: { theme: { include: { course: true } } },
        orderBy: { deadline: 'asc' },
        take: 15,
      }) : Promise.resolve([]),
      courseIds.length ? this.prisma.theme.findMany({
        where: { deadline: { gte: now, lte: inTwoWeeks }, is_visible: true, course_id: { in: courseIds } },
        include: { course: true },
        orderBy: { deadline: 'asc' },
        take: 10,
      }) : Promise.resolve([]),
    ]);

    const events = groups.length
      ? await this.prisma.event.findMany({
          where: { date: { gte: now, lte: inTwoWeeks }, group_id: { in: groups.map((g) => g.id) } },
          orderBy: { date: 'asc' },
          take: 5,
        })
      : [];

    if (!lessons.length && !themes.length && !events.length) {
      return this.reply(chatId,
        '✅ <b>Ближайшие 2 недели свободны!</b>\n\nНет ни дедлайнов, ни запланированных событий. Отличная работа!',
        { buttons: [[{ text: '← Назад к статистике', callback_data: 'stats' }]] },
      );
    }

    let text = `⏰ <b>Дедлайны (14 дней)</b>\n${'─'.repeat(28)}\n\n`;

    if (themes.length) {
      text += `📚 <b>Модули:</b>\n`;
      for (const t of themes) {
        text += `• <b>${esc(t.title)}</b>  ${daysLeft(t.deadline)}\n  <i>${esc(t.course.title)}</i>\n`;
      }
      text += '\n';
    }

    if (lessons.length) {
      text += `📝 <b>Уроки:</b>\n`;
      for (const l of lessons) {
        text += `• <b>${esc(l.title)}</b>  ${daysLeft(l.deadline)}\n  <i>${esc(l.theme?.course?.title)} · ${fmtDate(l.deadline)}</i>\n`;
      }
      text += '\n';
    }

    if (events.length) {
      text += `📅 <b>События:</b>\n`;
      for (const ev of events) {
        const icon = ev.type === 'WEBINAR' ? '🎥' : '📌';
        text += `${icon} <b>${esc(ev.title)}</b>  ${daysLeft(ev.date)}\n  <i>${fmtDate(ev.date)}</i>\n`;
      }
    }

    return this.setCachedReply(cacheKey, this.reply(chatId, text, {
      buttons: [[{ text: '← Назад к статистике', callback_data: 'stats' }]],
    }));
  }

  // ─────────────── Уведомления (проактивные) ───────────────

  async notifySubmissionGraded(submissionId: string, kind: 'written' | 'oral' = 'written') {
    const sub = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: { include: { parent: true } },
        lesson: { include: { theme: { include: { course: true } } } },
      },
    });
    if (!sub || sub.status !== 'GRADED') return;

    const student = sub.user;
    const scorePct = sub.max_score > 0 ? Math.round(((sub.score ?? 0) / sub.max_score) * 100) : 0;
    const icon = kind === 'oral' ? '🎤' : '📝';
    const title = kind === 'oral' ? 'Балл за устный ответ' : 'Куратор проверил задание';

    const text =
      `${icon} <b>${title}</b>\n` +
      `${'─'.repeat(26)}\n\n` +
      `👤 <b>${esc(this.userName(student))}</b>\n` +
      `📖 ${esc(sub.lesson?.theme?.course?.title ?? '—')}\n` +
      `📌 ${esc(sub.lesson?.title ?? '—')}\n\n` +
      `${medal(scorePct)} <b>Балл: ${sub.score ?? 0} / ${sub.max_score || 100}</b>  (${scorePct}/100)\n` +
      `${bar(scorePct)}\n\n` +
      `💬 <i>${esc(sub.comment || 'Без комментария')}</i>`;

    const courseId = sub.lesson?.theme?.course_id;
    const buttons: TgButton[][] = courseId
      ? [[{ text: '📊 Посмотреть статистику курса', callback_data: `course:${courseId}` }]]
      : [];

    const recipients = [student, student.parent].filter(Boolean) as any[];
    recipients.forEach((u) => {
      const chatId = this.getChatIdForUser(u.id);
      if (!chatId) {
        this.logger.warn(`Telegram notification skipped: user ${u.id} has no linked chatId`);
        return;
      }
      this.enqueuePush(chatId, text, { buttons });
    });

    this.invalidateStudentReplyCache(student.id);
  }

  // Ежедневные напоминания о дедлайнах (9:00)
  async sendDeadlineReminders() {
    const links = this.loadLinks();
    if (!Object.keys(links).length) return;

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 86400000);

    for (const entry of Object.values(links)) {
      try {
        if (!entry.chatId) continue;
        const user = await this.prisma.user.findUnique({ where: { id: entry.userId } });
        if (!user) continue;

        const student = await this.resolveStudent(user);
        if (!student) continue;

        const courses = await this.getStudentCourses(student.id);
        const courseIds = courses.map((c) => c.id);
        if (!courseIds.length) continue;

        const [lessons, groups] = await Promise.all([
          this.prisma.lesson.findMany({
            where: { deadline: { gte: now, lte: in3Days }, is_visible: true, theme: { course_id: { in: courseIds } } },
            include: { theme: { include: { course: true } } },
            orderBy: { deadline: 'asc' },
            take: 5,
          }),
          this.prisma.group.findMany({
            where: { students: { some: { id: student.id } } },
            select: { id: true },
          }),
        ]);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const events = groups.length ? await this.prisma.event.findMany({
          where: { date: { gte: tomorrow, lte: tomorrowEnd }, group_id: { in: groups.map((g) => g.id) } },
          orderBy: { date: 'asc' },
          take: 3,
        }) : [];

        if (!lessons.length && !events.length) continue;

        let text = `⏰ <b>Напоминание о ближайших дедлайнах</b>\n${'─'.repeat(26)}\n\n`;
        for (const l of lessons) {
          text += `📝 <b>${esc(l.title)}</b>\n   <i>${esc(l.theme?.course?.title)}</i> · ${daysLeft(l.deadline)}\n`;
        }
        for (const ev of events) {
          text += `📅 <b>${esc(ev.title)}</b> — завтра!\n`;
        }

        this.enqueuePush(entry.chatId, text, {
          buttons: [[{ text: '📅 Все дедлайны', callback_data: 'deadlines' }]],
        });
      } catch (e: any) {
        this.logger.warn(`Reminder error for ${entry.userId}: ${e?.message}`);
      }
    }
  }

  async testSend(chatId: string) {
    return this.pushMessage(chatId, '✅ Тест: backend успешно отправляет сообщения в Telegram.');
  }

  async health() {
    const links = Object.values(this.loadLinks());
    const linked = links.filter((l) => !!l.chatId);
    return {
      tokenConfigured: !!this.token,
      botUsername: this.botUsername,
      preparedCodes: links.length,
      linkedChats: linked.length,
      proxyConfigured: !!(process.env.HTTPS_PROXY || process.env.HTTP_PROXY),
      queueSize: this.pushQueue.length,
      pushStats: this.pushStats,
      lastPushError: this.lastPushError,
      replyCacheSize: this._replyCache.size,
    };
  }

  // ─────────────── Вычисления ───────────────

  private async buildOverallSummary(studentId: string, courseIds: string[]) {
    const [subs, attempts] = await Promise.all([
      this.prisma.submission.findMany({
        where: { user_id: studentId, status: 'GRADED', lesson: { theme: { course_id: { in: courseIds } } } },
        select: { score: true, max_score: true },
      }),
      this.prisma.testAttempt.findMany({
        where: { user_id: studentId },
        select: { test_id: true, score: true },
      }),
    ]);

    const latest = new Map<string, number>();
    attempts.forEach((a) => { if (!latest.has(a.test_id)) latest.set(a.test_id, a.score || 0); });

    let sum = 0; let cnt = 0;
    subs.forEach((s) => { sum += s.max_score > 0 ? ((s.score ?? 0) / s.max_score) * 100 : 0; cnt++; });
    latest.forEach((score) => { sum += Math.min(100, score); cnt++; });

    return { overall: cnt > 0 ? Math.round(sum / cnt) : 0 };
  }

  private async calcStats(studentId: string, courseId?: string, themeId?: string) {
    const lessonWhere: any = themeId
      ? { theme_id: themeId }
      : courseId
        ? { theme: { course_id: courseId } }
        : undefined;

    const subs = await this.prisma.submission.findMany({
      where: { user_id: studentId, status: 'GRADED', ...(lessonWhere ? { lesson: lessonWhere } : {}) },
      select: { score: true, max_score: true, block_id: true, comment: true },
    });

    const b = { tests: { e: 0, m: 0 }, written: { e: 0, m: 0 }, oral: { e: 0, m: 0 } };
    subs.forEach((s) => {
      const bid = String(s.block_id || '');
      const type = bid.startsWith('oral-') ? 'oral'
        : (s.comment ?? '').includes(AUTO_PREFIX) ? 'tests'
        : 'written';
      b[type].e += s.score || 0;
      b[type].m += s.max_score || 100;
    });

    const pct = (e: number, m: number) => m > 0 ? Math.round((e / m) * 100) : 0;
    const tests = pct(b.tests.e, b.tests.m);
    const written = pct(b.written.e, b.written.m);
    const oral = pct(b.oral.e, b.oral.m);

    return { tests, written, oral, overall: Math.round((tests + written + oral) / 3), count: subs.length };
  }

  private async getLessonBreakdown(studentId: string, themeId: string) {
    const [lessons, subs] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { theme_id: themeId, is_visible: true, include_in_analytics: true },
        orderBy: { order_index: 'asc' },
        select: { id: true, title: true, deadline: true },
      }),
      this.prisma.submission.findMany({
        where: { user_id: studentId, status: 'GRADED', lesson: { theme_id: themeId } },
        select: { lesson_id: true },
      }),
    ]);

    const doneLessons = new Set(subs.map((s) => s.lesson_id));
    return lessons.map((l) => ({ title: l.title, done: doneLessons.has(l.id), deadline: l.deadline }));
  }

  private async getNearestCourseDeadline(courseId: string) {
    const now = new Date();
    const [lesson, theme] = await Promise.all([
      this.prisma.lesson.findFirst({
        where: { deadline: { gte: now }, is_visible: true, theme: { course_id: courseId } },
        orderBy: { deadline: 'asc' },
        select: { title: true, deadline: true },
      }),
      this.prisma.theme.findFirst({
        where: { deadline: { gte: now }, course_id: courseId, is_visible: true },
        orderBy: { deadline: 'asc' },
        select: { title: true, deadline: true },
      }),
    ]);

    if (!lesson && !theme) return null;
    if (!lesson) return { title: theme!.title, date: theme!.deadline! };
    if (!theme)  return { title: lesson.title, date: lesson.deadline! };
    return lesson.deadline! < theme.deadline!
      ? { title: lesson.title, date: lesson.deadline! }
      : { title: theme.title, date: theme.deadline! };
  }

  private async getAnyNearestDeadline(studentId: string) {
    const courses = await this.getStudentCourses(studentId);
    if (!courses.length) return null;
    const courseIds = courses.map((c) => c.id);

    const lesson = await this.prisma.lesson.findFirst({
      where: { deadline: { gte: new Date() }, is_visible: true, theme: { course_id: { in: courseIds } } },
      orderBy: { deadline: 'asc' },
      select: { title: true, deadline: true },
    });
    return lesson ? { title: lesson.title, date: lesson.deadline! } : null;
  }

  private async calcStreak(studentId: string) {
    const [attempts, subs] = await Promise.all([
      this.prisma.testAttempt.findMany({ where: { user_id: studentId }, select: { created_at: true } }),
      this.prisma.submission.findMany({ where: { user_id: studentId }, select: { created_at: true } }),
    ]);

    const dates = [
      ...attempts.map((a) => new Date(a.created_at).setHours(0, 0, 0, 0)),
      ...subs.map((s) => new Date(s.created_at).setHours(0, 0, 0, 0)),
    ];
    const unique = [...new Set(dates)].sort((a, b) => b - a);
    if (!unique.length) return 0;

    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;
    let check = unique[0] === today ? today : unique[0] === yesterday ? yesterday : null;
    if (check === null) return 0;

    let streak = 1;
    for (let i = 1; i < unique.length; i++) {
      if (unique[i] === check - 86400000) { streak++; check -= 86400000; } else break;
    }
    return streak;
  }
}
