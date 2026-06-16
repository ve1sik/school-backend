"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = require("axios");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const https_1 = require("https");
const path_1 = require("path");
function telegramProxyUrl() {
    return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
}
function parseTelegramProxy(proxyUrl) {
    try {
        const u = new URL(proxyUrl);
        return {
            protocol: (u.protocol.replace(':', '') || 'http'),
            host: u.hostname,
            port: Number(u.port) || 8080,
            auth: u.username
                ? {
                    username: decodeURIComponent(u.username),
                    password: decodeURIComponent(u.password),
                }
                : undefined,
        };
    }
    catch {
        return null;
    }
}
function maskTelegramProxy(proxyUrl) {
    try {
        const u = new URL(proxyUrl);
        return `${u.hostname}:${u.port || '8080'}`;
    }
    catch {
        return 'invalid';
    }
}
function createTelegramHttpClient() {
    const config = {
        baseURL: process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org',
        timeout: 12000,
    };
    const proxyUrl = telegramProxyUrl();
    const proxy = proxyUrl ? parseTelegramProxy(proxyUrl) : null;
    if (proxy) {
        config.proxy = proxy;
        return { client: axios_1.default.create(config), proxyHost: maskTelegramProxy(proxyUrl) };
    }
    config.proxy = false;
    config.httpsAgent = new https_1.Agent({ keepAlive: true, maxSockets: 20 });
    return { client: axios_1.default.create(config), proxyHost: null };
}
const TG_HTTP = createTelegramHttpClient();
const MAIN_KEYBOARD = {
    keyboard: [
        [{ text: '📊 Статистика' }, { text: '📅 Дедлайны' }],
        [{ text: '👤 Мой профиль' }, { text: '📚 Мои курсы' }],
        [{ text: '🔔 Уведомления' }, { text: '🔄 Перезапустить' }],
        [{ text: '❓ Помощь' }],
    ],
    resize_keyboard: true,
    persistent: true,
    one_time_keyboard: false,
};
const AUTO_PREFIX = 'Автоматическая проверка';
const LEGACY_LINKS_PATH = (0, path_1.join)(process.cwd(), 'telegram-links.json');
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const bar = (v, len = 10) => {
    const filled = Math.min(len, Math.round((v / 100) * len));
    return '▓'.repeat(filled) + '░'.repeat(len - filled);
};
const medal = (v) => v >= 90 ? '🥇' : v >= 75 ? '🥈' : v >= 50 ? '🥉' : '❗';
const trend = (v) => v >= 80 ? '📈' : v >= 50 ? '➡️' : '📉';
const fmtDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
const daysLeft = (d) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff < 0)
        return '⛔ просрочен';
    if (diff === 0)
        return '🔥 сегодня!';
    if (diff === 1)
        return '⚠️ завтра';
    if (diff <= 3)
        return `⚠️ через ${diff} дн.`;
    return `через ${diff} дн.`;
};
let TelegramService = TelegramService_1 = class TelegramService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(TelegramService_1.name);
        this._userCache = new Map();
        this._coursesCache = new Map();
        this._chatStudentCache = new Map();
        this._gradedDataCache = new Map();
        this.tg = TG_HTTP.client;
    }
    onModuleInit() {
        if (TG_HTTP.proxyHost) {
            this.logger.log(`Telegram outbound proxy: ${TG_HTTP.proxyHost}`);
        }
        else {
            this.logger.warn('Telegram outbound: direct connection (HTTPS_PROXY not set)');
        }
        this.migrateLegacyLinks().catch((e) => this.logger.warn(`Legacy TG links migration: ${e?.message}`));
        const scheduleDaily = () => {
            const now = new Date();
            const next9 = new Date(now);
            next9.setHours(9, 0, 0, 0);
            if (next9 <= now)
                next9.setDate(next9.getDate() + 1);
            setTimeout(() => {
                this.sendDeadlineReminders().catch((e) => this.logger.error(e));
                setInterval(() => this.sendDeadlineReminders().catch((e) => this.logger.error(e)), 24 * 3600 * 1000);
            }, next9.getTime() - now.getTime());
        };
        scheduleDaily();
        this.registerBotCommands().catch(() => { });
    }
    get token() { return process.env.TELEGRAM_BOT_TOKEN || ''; }
    get botUsername() { return process.env.TELEGRAM_BOT_USERNAME || 'prepodmgybot'; }
    get botUrl() { return `https://t.me/${this.botUsername}`; }
    buildReply(chatId, text, extra) {
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
            ...(reply_markup ? { reply_markup } : {}),
        };
    }
    async registerBotCommands() {
        if (!this.token)
            return;
        try {
            await this.tg.post(`/bot${this.token}/setMyCommands`, {
                commands: [
                    { command: 'start', description: '🏠 Начало / главное меню' },
                    { command: 'stats', description: '📊 Статистика по курсам' },
                    { command: 'deadlines', description: '📅 Ближайшие дедлайны' },
                    { command: 'profile', description: '👤 Мой профиль' },
                    { command: 'courses', description: '📚 Список моих курсов' },
                    { command: 'help', description: '❓ Помощь' },
                ],
            });
        }
        catch { }
    }
    async pushNotification(chatId, text, extra) {
        if (!this.token) {
            this.logger.error('pushNotification skipped: TELEGRAM_BOT_TOKEN is not set');
            return false;
        }
        const reply_markup = extra?.buttons ? { inline_keyboard: extra.buttons } : MAIN_KEYBOARD;
        const payload = {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup,
        };
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                await this.tg.post(`/bot${this.token}/sendMessage`, payload);
                return true;
            }
            catch (e) {
                const err = e?.response?.data?.description || e?.code || e?.message || 'unknown';
                if (attempt === 2) {
                    this.logger.error(`pushNotification failed for chat ${chatId} (attempt ${attempt}): ${err}`);
                    return false;
                }
                await new Promise((r) => setTimeout(r, 250));
            }
        }
        return false;
    }
    async answerCbq(id) {
        if (!this.token)
            return;
        try {
            await this.tg.post(`/bot${this.token}/answerCallbackQuery`, { callback_query_id: id });
        }
        catch { }
    }
    async handleUpdate(update) {
        try {
            if (update?.message) {
                const chatId = String(update.message.chat.id);
                const text = String(update.message.text || '').trim();
                return await this.handleMessage(chatId, text);
            }
            if (update?.callback_query) {
                const chatId = String(update.callback_query.message.chat.id);
                const data = String(update.callback_query.data || '');
                this.answerCbq(update.callback_query.id).catch(() => { });
                return await this.handleCallback(chatId, data);
            }
        }
        catch (e) {
            this.logger.error(`handleUpdate error: ${e?.message}`);
        }
        return { ok: true };
    }
    async handleMessage(chatId, text) {
        const clean = text.trim();
        const cmd = clean.replace(/^\/(\w+).*/, '$1').toLowerCase();
        if (cmd === 'start' || cmd === 'restart')
            return this.doStart(chatId, clean);
        if (cmd === 'stats')
            return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
        if (cmd === 'deadlines')
            return this.requireLinked(chatId, (s) => this.showDeadlines(chatId, s.id));
        if (cmd === 'profile')
            return this.requireLinked(chatId, (s) => this.showProfile(chatId, s));
        if (cmd === 'courses')
            return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
        if (cmd === 'help')
            return this.doHelp(chatId);
        if (text === '📊 Статистика')
            return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
        if (text === '📅 Дедлайны')
            return this.requireLinked(chatId, (s) => this.showDeadlines(chatId, s.id));
        if (text === '👤 Мой профиль')
            return this.requireLinked(chatId, (s) => this.showProfile(chatId, s));
        if (text === '📚 Мои курсы')
            return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
        if (text === '🔔 Уведомления')
            return this.doNotifInfo(chatId);
        if (text === '🔄 Перезапустить')
            return this.doStart(chatId, '/start');
        if (text === '❓ Помощь')
            return this.doHelp(chatId);
        const codeMatch = clean.match(/^(?:\/start\s+)?([A-Z0-9]{6,16})$/i);
        if (codeMatch)
            return this.handleLinkCode(chatId, codeMatch[1].toUpperCase());
        return this.doStart(chatId, clean);
    }
    async handleCallback(chatId, data) {
        const student = await this.resolveStudent(chatId);
        if (!student) {
            return this.buildReply(chatId, '⚠️ Сначала отправьте Telegram-код с сайта.');
        }
        if (data === 'stats')
            return this.showCourseList(chatId, student.id);
        if (data === 'deadlines')
            return this.showDeadlines(chatId, student.id);
        if (data === 'profile')
            return this.showProfile(chatId, student);
        if (data === 'courses')
            return this.showCourseList(chatId, student.id);
        if (data.startsWith('course:'))
            return this.showCourseStats(chatId, student.id, data.slice(7));
        if (data.startsWith('theme:'))
            return this.showThemeStats(chatId, student.id, data.slice(6));
        return this.buildReply(chatId, '❓ Не понял команду. Используйте кнопки меню.');
    }
    async requireLinked(chatId, fn) {
        const student = await this.resolveStudent(chatId);
        if (!student)
            return this.sendWelcome(chatId);
        return fn(student);
    }
    async resolveStudent(chatId) {
        const now = Date.now();
        const hit = this._chatStudentCache.get(chatId);
        if (hit && hit.exp > now)
            return hit.student;
        const linked = await this.prisma.user.findFirst({
            where: { telegram_chat_id: chatId },
            select: { id: true, name: true, surname: true, email: true, role: true },
        });
        if (!linked)
            return null;
        let student = linked;
        if (linked.role === 'PARENT') {
            student = await this.prisma.user.findFirst({
                where: { parent_id: linked.id },
                select: { id: true, name: true, surname: true, email: true, role: true },
            });
            if (!student)
                return null;
        }
        this._chatStudentCache.set(chatId, { student, exp: now + 5 * 60 * 1000 });
        return student;
    }
    userName(u) {
        return `${u?.surname ?? ''} ${u?.name ?? u?.email ?? 'Пользователь'}`.trim();
    }
    sendWelcome(chatId) {
        return this.buildReply(chatId, '👋 <b>Привет! Я бот школы «Препод из МГУ».</b>\n\n' +
            'Я помогу вам:\n' +
            '📊 Смотреть статистику и оценки\n' +
            '📅 Следить за дедлайнами\n' +
            '🔔 Получать уведомления от куратора\n\n' +
            '📌 <b>Чтобы начать — введите ваш Telegram-код.</b>\n' +
            'Код находится:\n' +
            '• Ученик → <b>Мой профиль</b> → блок «Telegram бот»\n' +
            '• Родитель → <b>Кабинет родителя</b> → блок «Telegram бот»', { keyboard: false });
    }
    async doStart(chatId, text) {
        const deepCode = text.replace(/^\/start\s*/i, '').trim().toUpperCase();
        if (deepCode && deepCode !== 'START') {
            return this.handleLinkCode(chatId, deepCode);
        }
        const linked = await this.prisma.user.findFirst({
            where: { telegram_chat_id: chatId },
            select: { id: true },
        });
        if (!linked)
            return this.sendWelcome(chatId);
        return this.buildReply(chatId, `🏠 <b>Главное меню</b>\n${'─'.repeat(26)}\n\n` +
            `Бот готов к работе.\n\n` +
            `📊 <b>Статистика</b> — оценки по курсам\n` +
            `📅 <b>Дедлайны</b> — ближайшие сроки\n` +
            `👤 <b>Мой профиль</b> — данные аккаунта\n` +
            `🔔 <b>Уведомления</b> — что приходит в Telegram\n\n` +
            `Используйте постоянное меню снизу 👇`);
    }
    doHelp(chatId) {
        return this.buildReply(chatId, `❓ <b>Помощь</b>\n${'─'.repeat(26)}\n\n` +
            `/start — главное меню\n` +
            `/stats — статистика\n` +
            `/deadlines — дедлайны\n` +
            `/profile — профиль\n` +
            `/courses — курсы\n` +
            `/help — помощь\n\n` +
            `Используйте кнопки меню — они всегда внизу экрана.`);
    }
    doNotifInfo(chatId) {
        return this.buildReply(chatId, `🔔 <b>Уведомления включены</b>\n\n` +
            `✅ Когда куратор проверил задание\n` +
            `✅ Когда выставлен балл за устный ответ\n` +
            `✅ Напоминания о дедлайнах (каждый день в 9:00)\n\n` +
            `Уведомления работают автоматически, пока аккаунт привязан.`);
    }
    async handleLinkCode(chatId, code) {
        let user = await this.prisma.user.findFirst({
            where: { telegram_link_code: code },
            select: {
                id: true, email: true, name: true, surname: true, role: true,
                telegram_chat_id: true,
            },
        });
        if (!user && code.startsWith('TG')) {
            user = await this.findUserByLegacyCode(code);
        }
        if (!user) {
            return this.buildReply(chatId, '❌ <b>Код не найден или уже использован.</b>\n\n' +
                'Откройте профиль на сайте → блок «Telegram бот» → нажмите «Открыть бота» или скопируйте новый код.', { keyboard: false });
        }
        if (user.telegram_chat_id && user.telegram_chat_id !== chatId) {
            return this.buildReply(chatId, '⚠️ Этот аккаунт уже привязан к другому Telegram.\n\n' +
                'Если это ваш аккаунт — отвяжите Telegram в профиле на сайте и повторите подключение.', { keyboard: false });
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                telegram_chat_id: chatId,
                telegram_link_code: null,
                telegram_linked_at: new Date(),
            },
        });
        this.invalidateUserCache(user.id);
        const student = user.role === 'PARENT'
            ? await this.prisma.user.findFirst({
                where: { parent_id: user.id },
                select: { id: true, name: true, surname: true, email: true, role: true },
            })
            : user;
        if (student) {
            this._chatStudentCache.set(chatId, { student, exp: Date.now() + 5 * 60 * 1000 });
        }
        const roleLabel = user.role === 'PARENT' ? 'Родитель' : 'Ученик';
        let text = `✅ <b>Аккаунт успешно привязан!</b>\n\n` +
            `${roleLabel}: <b>${esc(this.userName(user))}</b>\n\n`;
        if (student) {
            text += await this.buildAnalyticsSnapshot(student);
            text += `\nПостоянное меню внизу 👇 — <b>📊 Статистика</b>, <b>📅 Дедлайны</b>.`;
        }
        else {
            text += 'К аккаунту родителя пока не привязан ученик.\nСделайте это в «Кабинете родителя» на сайте.';
        }
        return this.buildReply(chatId, text);
    }
    formatBreakdownCards(stats) {
        const row = (label, value, emoji) => `${emoji} <b>${label}</b>  ${bar(value, 8)} <b>${value}</b>/100\n`;
        return (`${row('Тесты', stats.tests, '🔵')}` +
            `${row('Письменные', stats.written, '🟠')}` +
            `${row('Устные', stats.oral, '🟢')}\n` +
            `⭐ <b>Оценено:</b> ${stats.count} заданий учтено\n`);
    }
    async buildAnalyticsSnapshot(student) {
        const [courses, groups, streakDays, stats] = await Promise.all([
            this.getStudentCourses(student.id),
            this.prisma.group.findMany({
                where: { students: { some: { id: student.id } } },
                select: { title: true },
            }),
            this.calcStreak(student.id),
            this.calcStats(student.id),
        ]);
        const summary = courses.length
            ? await this.buildOverallSummary(student.id, courses.map((c) => c.id))
            : { overall: stats.overall };
        let text = `📊 <b>Ваша аналитика</b>\n${'─'.repeat(28)}\n\n` +
            `${medal(summary.overall)} <b>Общий балл: ${summary.overall}/100</b>\n` +
            `${bar(summary.overall)}\n\n` +
            this.formatBreakdownCards(stats);
        if (streakDays > 0)
            text += `🔥 Стрик: <b>${streakDays} дн.</b> подряд\n`;
        if (groups.length)
            text += `👥 Группы: <i>${esc(groups.map((g) => g.title).join(', '))}</i>\n`;
        if (courses.length) {
            const { subs } = await this.getGradedData(student.id);
            const statsArr = courses.map((c) => this.computeStats(subs, { courseId: c.id }));
            text += `\n<b>По курсам:</b>\n`;
            courses.forEach((c, i) => {
                const s = statsArr[i];
                const emoji = s.overall >= 75 ? '🟢' : s.overall >= 50 ? '🟡' : s.count > 0 ? '🔴' : '⬜';
                text += `${emoji} ${esc(c.title)} — <b>${s.overall}/100</b>\n`;
            });
        }
        return text;
    }
    async showProfile(chatId, student) {
        const [courses, groups, streakDays, stats] = await Promise.all([
            this.getStudentCourses(student.id),
            this.prisma.group.findMany({
                where: { students: { some: { id: student.id } } },
                select: { title: true },
            }),
            this.calcStreak(student.id),
            this.calcStats(student.id),
        ]);
        const summary = courses.length
            ? await this.buildOverallSummary(student.id, courses.map((c) => c.id))
            : { overall: stats.overall };
        const text = `👤 <b>${esc(this.userName(student))}</b>\n` +
            `${'─'.repeat(28)}\n\n` +
            `📚 Курсов: <b>${courses.length}</b>\n` +
            (groups.length ? `👥 Группы: <b>${groups.map((g) => g.title).join(', ')}</b>\n` : '') +
            `\n${medal(summary.overall)} <b>Общий балл: ${summary.overall}/100</b>\n` +
            `${bar(summary.overall)}\n\n` +
            this.formatBreakdownCards(stats) +
            (streakDays > 0 ? `\n🔥 Стрик: <b>${streakDays} дн.</b> подряд\n` : '');
        return this.buildReply(chatId, text, {
            buttons: [
                [{ text: '📊 Статистика', callback_data: 'stats' }],
                [{ text: '📅 Дедлайны', callback_data: 'deadlines' }],
            ],
        });
    }
    async showCourseList(chatId, studentId) {
        const courses = await this.getStudentCourses(studentId);
        if (!courses.length) {
            return this.buildReply(chatId, '📚 Вы пока не записаны ни на один курс.\n\nОткройте магазин на сайте и подайте заявку.');
        }
        const [statsArr, globalStats] = await Promise.all([
            (async () => {
                const { subs } = await this.getGradedData(studentId);
                return courses.map((c) => this.computeStats(subs, { courseId: c.id }));
            })(),
            this.calcStats(studentId),
        ]);
        const avg = Math.round(statsArr.reduce((a, s) => a + s.overall, 0) / statsArr.length);
        const text = `📚 <b>Мои курсы</b>  ${trend(avg)}\n` +
            `${'─'.repeat(28)}\n\n` +
            `${medal(avg)} <b>Средний балл: ${avg}/100</b>\n` +
            `${bar(avg)}\n\n` +
            this.formatBreakdownCards(globalStats) +
            `\n<b>Выберите курс:</b>`;
        const buttons = courses.map((c, i) => {
            const s = statsArr[i];
            const emoji = s.overall >= 75 ? '🟢' : s.overall >= 50 ? '🟡' : s.count > 0 ? '🔴' : '⬜';
            return [{ text: `${emoji} ${c.title} — ${s.overall}/100`, callback_data: `course:${c.id}` }];
        });
        buttons.push([{ text: '📅 Дедлайны', callback_data: 'deadlines' }]);
        return this.buildReply(chatId, text, { buttons });
    }
    async showCourseStats(chatId, studentId, courseId) {
        const [course, stats, deadline] = await Promise.all([
            this.prisma.course.findUnique({
                where: { id: courseId },
                include: { themes: { where: { is_visible: true }, orderBy: { order_index: 'asc' } } },
            }),
            this.calcStats(studentId, courseId),
            this.getNearestCourseDeadline(courseId),
        ]);
        if (!course)
            return this.buildReply(chatId, 'Курс не найден.');
        const t = (n) => `${bar(n, 8)} <b>${n}</b>/100`;
        let text = `📖 <b>${esc(course.title)}</b>\n` +
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
        const themeButtons = (course.themes || []).map((th) => [
            { text: `📌 ${th.title}`, callback_data: `theme:${th.id}` },
        ]);
        themeButtons.push([{ text: '📅 Все дедлайны курса', callback_data: 'deadlines' }], [{ text: '← Все курсы', callback_data: 'stats' }]);
        return this.buildReply(chatId, text, { buttons: themeButtons });
    }
    async showThemeStats(chatId, studentId, themeId) {
        const [theme, stats] = await Promise.all([
            this.prisma.theme.findUnique({
                where: { id: themeId },
                include: { lessons: { where: { is_visible: true }, orderBy: { order_index: 'asc' } } },
            }),
            this.calcStats(studentId, undefined, themeId),
        ]);
        if (!theme)
            return this.buildReply(chatId, 'Модуль не найден.');
        const lessonBreakdown = await this.getLessonBreakdown(studentId, themeId);
        const t = (n) => `${bar(n, 8)} <b>${n}</b>/100`;
        let text = `📌 <b>${esc(theme.title)}</b>\n` +
            `${'─'.repeat(28)}\n\n` +
            `${medal(stats.overall)} <b>Балл по модулю: ${stats.overall}/100</b>\n` +
            `${bar(stats.overall)}\n\n` +
            `🔵 Тесты         ${t(stats.tests)}\n` +
            `🟡 Письменные   ${t(stats.written)}\n` +
            `🟢 Устные        ${t(stats.oral)}\n`;
        if (lessonBreakdown.length) {
            text += `\n<b>Уроки (${lessonBreakdown.filter((l) => l.done).length}/${lessonBreakdown.length} ✅):</b>\n`;
            for (const ls of lessonBreakdown) {
                text += `${ls.done ? '✅' : '⬜'} ${esc(ls.title)}`;
                if (ls.deadline)
                    text += `  <i>${daysLeft(ls.deadline)}</i>`;
                text += '\n';
            }
        }
        if (theme.deadline) {
            text += `\n⏰ Дедлайн: <b>${fmtDate(theme.deadline)}</b> — ${daysLeft(theme.deadline)}`;
        }
        return this.buildReply(chatId, text, {
            buttons: [
                [{ text: `← Назад к курсу`, callback_data: `course:${theme.course_id}` }],
                [{ text: '← Все курсы', callback_data: 'stats' }],
            ],
        });
    }
    async showDeadlines(chatId, studentId) {
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
            return this.buildReply(chatId, '✅ <b>Ближайшие 2 недели свободны!</b>\n\nНет дедлайнов и событий. Отличная работа!', { buttons: [[{ text: '← Назад к статистике', callback_data: 'stats' }]] });
        }
        let text = `⏰ <b>Дедлайны (14 дней)</b>\n${'─'.repeat(28)}\n\n`;
        if (themes.length) {
            text += `📚 <b>Модули:</b>\n`;
            for (const th of themes) {
                text += `• <b>${esc(th.title)}</b>  ${daysLeft(th.deadline)}\n  <i>${esc(th.course.title)}</i>\n`;
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
        return this.buildReply(chatId, text, {
            buttons: [[{ text: '← Назад к статистике', callback_data: 'stats' }]],
        });
    }
    async notifySubmissionGraded(submissionId, kind = 'written') {
        const sub = await this.prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        surname: true,
                        telegram_chat_id: true,
                        parent: {
                            select: {
                                id: true,
                                email: true,
                                telegram_chat_id: true,
                            },
                        },
                    },
                },
                lesson: { include: { theme: { include: { course: true } } } },
            },
        });
        if (!sub || sub.status !== 'GRADED') {
            return { sent: false, reason: 'submission_not_graded' };
        }
        if (kind === 'written' && String(sub.comment ?? '').includes(AUTO_PREFIX)) {
            return { sent: false, reason: 'auto_graded' };
        }
        const student = sub.user;
        const scorePct = sub.max_score > 0 ? Math.round(((sub.score ?? 0) / sub.max_score) * 100) : 0;
        const icon = kind === 'oral' ? '🎤' : '📝';
        const title = kind === 'oral' ? 'Балл за устный ответ' : 'Куратор проверил задание';
        const text = `${icon} <b>${title}</b>\n` +
            `${'─'.repeat(26)}\n\n` +
            `👤 <b>${esc(this.userName(student))}</b>\n` +
            `📖 ${esc(sub.lesson?.theme?.course?.title ?? '—')}\n` +
            `📌 ${esc(sub.lesson?.title ?? '—')}\n\n` +
            `${medal(scorePct)} <b>Балл: ${sub.score ?? 0} / ${sub.max_score || 100}</b>  (${scorePct}/100)\n` +
            `${bar(scorePct)}\n\n` +
            `💬 <i>${esc(sub.comment || 'Без комментария')}</i>`;
        const courseId = sub.lesson?.theme?.course_id;
        const buttons = courseId
            ? [[{ text: '📊 Посмотреть статистику курса', callback_data: `course:${courseId}` }]]
            : [];
        const targets = [
            student.telegram_chat_id ? { chatId: student.telegram_chat_id, who: 'student' } : null,
            student.parent?.telegram_chat_id
                ? { chatId: student.parent.telegram_chat_id, who: 'parent' }
                : null,
        ].filter(Boolean);
        if (!targets.length) {
            this.logger.warn(`Grade notify skipped: no telegram_chat_id for student ${student.id} (${student.email}), submission ${submissionId}`);
            return { sent: false, reason: 'no_telegram_linked' };
        }
        let sentAny = false;
        for (const target of targets) {
            const ok = await this.pushNotification(target.chatId, text, { buttons });
            if (ok) {
                sentAny = true;
                this.logger.log(`Grade notify sent to ${target.who} chat ${target.chatId}, submission ${submissionId}`);
            }
        }
        if (!sentAny) {
            return { sent: false, reason: 'telegram_api_failed' };
        }
        this.invalidateGradedCache(student.id);
        return { sent: true };
    }
    async sendDeadlineReminders() {
        const linkedUsers = await this.prisma.user.findMany({
            where: { telegram_chat_id: { not: null } },
            select: { id: true, role: true, telegram_chat_id: true },
        });
        if (!linkedUsers.length)
            return;
        const now = new Date();
        const in3Days = new Date(now.getTime() + 3 * 86400000);
        for (const entry of linkedUsers) {
            try {
                const chatId = entry.telegram_chat_id;
                const user = await this.prisma.user.findUnique({ where: { id: entry.id } });
                if (!user)
                    continue;
                const student = user.role === 'PARENT'
                    ? await this.prisma.user.findFirst({ where: { parent_id: user.id } })
                    : user;
                if (!student)
                    continue;
                const courses = await this.getStudentCourses(student.id);
                const courseIds = courses.map((c) => c.id);
                if (!courseIds.length)
                    continue;
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
                if (!lessons.length && !events.length)
                    continue;
                let text = `⏰ <b>Напоминание о ближайших дедлайнах</b>\n${'─'.repeat(26)}\n\n`;
                for (const l of lessons) {
                    text += `📝 <b>${esc(l.title)}</b>\n   <i>${esc(l.theme?.course?.title)}</i> · ${daysLeft(l.deadline)}\n`;
                }
                for (const ev of events) {
                    text += `📅 <b>${esc(ev.title)}</b> — завтра!\n`;
                }
                await this.pushNotification(chatId, text, {
                    buttons: [[{ text: '📅 Все дедлайны', callback_data: 'deadlines' }]],
                });
            }
            catch (e) {
                this.logger.warn(`Reminder error for ${entry.id}: ${e?.message}`);
            }
        }
    }
    async testSend(chatId) {
        try {
            await this.pushNotification(chatId, '✅ Тест: backend успешно отправляет сообщения в Telegram.');
            return { ok: true };
        }
        catch (e) {
            return { ok: false, error: e?.code || e?.message };
        }
    }
    async health() {
        const [linked, prepared] = await Promise.all([
            this.prisma.user.count({ where: { telegram_chat_id: { not: null } } }),
            this.prisma.user.count({ where: { telegram_link_code: { not: null } } }),
        ]);
        return {
            tokenConfigured: !!this.token,
            botUsername: this.botUsername,
            preparedCodes: prepared,
            linkedChats: linked,
            architecture: 'webhook-reply + db-links',
            outboundProxy: TG_HTTP.proxyHost || null,
        };
    }
    generateLinkCode() {
        return (0, crypto_1.randomBytes)(4).toString('hex').toUpperCase();
    }
    buildLegacyCode(userId) {
        return `TG${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    }
    async findUserByLegacyCode(code) {
        const uuidPrefix = code.slice(2).toLowerCase();
        const candidates = await this.prisma.user.findMany({
            where: { id: { startsWith: uuidPrefix } },
            select: {
                id: true, email: true, name: true, surname: true, role: true,
                telegram_chat_id: true,
            },
            take: 3,
        });
        return candidates.find((u) => this.buildLegacyCode(u.id) === code) || null;
    }
    async ensureTelegramCode(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { telegram_chat_id: true, telegram_link_code: true },
        });
        if (!user)
            return { code: null, botUrl: this.botUrl, linked: false };
        if (user.telegram_chat_id) {
            return { code: null, botUrl: this.botUrl, linked: true };
        }
        let code = user.telegram_link_code;
        if (!code) {
            code = this.generateLinkCode();
            await this.prisma.user.update({
                where: { id: userId },
                data: { telegram_link_code: code },
            });
        }
        return {
            code,
            botUrl: `${this.botUrl}?start=${code}`,
            linked: false,
        };
    }
    async getChatIdForUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { telegram_chat_id: true },
        });
        return user?.telegram_chat_id || null;
    }
    async findUserByChatId(chatId) {
        return this.prisma.user.findFirst({
            where: { telegram_chat_id: chatId },
            include: { parent: true },
        });
    }
    async migrateLegacyLinks() {
        if (!(0, fs_1.existsSync)(LEGACY_LINKS_PATH))
            return;
        let raw;
        try {
            raw = JSON.parse((0, fs_1.readFileSync)(LEGACY_LINKS_PATH, 'utf8')) || {};
        }
        catch {
            return;
        }
        let migrated = 0;
        for (const entry of Object.values(raw)) {
            if (!entry?.chatId || !entry?.userId)
                continue;
            try {
                await this.prisma.user.updateMany({
                    where: { id: entry.userId, telegram_chat_id: null },
                    data: {
                        telegram_chat_id: entry.chatId,
                        telegram_linked_at: new Date(),
                        telegram_link_code: null,
                    },
                });
                migrated++;
            }
            catch { }
        }
        if (migrated) {
            this.logger.log(`Migrated ${migrated} Telegram links from telegram-links.json into DB`);
        }
    }
    async cachedUser(userId) {
        const now = Date.now();
        const hit = this._userCache.get(userId);
        if (hit && hit.exp > now)
            return hit.user;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { parent: true },
        });
        if (user)
            this._userCache.set(userId, { user, exp: now + 5 * 60 * 1000 });
        return user;
    }
    invalidateUserCache(userId) {
        this._userCache.delete(userId);
    }
    async getStudentCourses(studentId) {
        const now = Date.now();
        const hit = this._coursesCache.get(studentId);
        if (hit && hit.exp > now)
            return hit.courses;
        const [enrollments, groups] = await Promise.all([
            this.prisma.enrollment.findMany({ where: { user_id: studentId }, include: { course: true } }),
            this.prisma.group.findMany({ where: { students: { some: { id: studentId } } }, include: { courses: true } }),
        ]);
        const map = new Map();
        enrollments.forEach((e) => map.set(e.course_id, e.course));
        groups.forEach((g) => g.courses.forEach((c) => map.set(c.id, c)));
        const courses = Array.from(map.values());
        this._coursesCache.set(studentId, { courses, exp: now + 3 * 60 * 1000 });
        return courses;
    }
    async buildOverallSummary(studentId, courseIds) {
        const { subs, attempts } = await this.getGradedData(studentId);
        const scopedSubs = subs.filter((s) => courseIds.includes(s.lesson?.theme?.course_id || ''));
        const latest = new Map();
        attempts.forEach((a) => { if (!latest.has(a.test_id))
            latest.set(a.test_id, a.score || 0); });
        let sum = 0;
        let cnt = 0;
        scopedSubs.forEach((s) => { sum += s.max_score > 0 ? ((s.score ?? 0) / s.max_score) * 100 : 0; cnt++; });
        latest.forEach((score) => { sum += Math.min(100, score); cnt++; });
        return { overall: cnt > 0 ? Math.round(sum / cnt) : 0 };
    }
    computeStats(subs, filter) {
        const filtered = subs.filter((s) => {
            if (filter?.themeId)
                return s.lesson?.theme_id === filter.themeId;
            if (filter?.courseId)
                return s.lesson?.theme?.course_id === filter.courseId;
            return true;
        });
        const b = { tests: { e: 0, m: 0 }, written: { e: 0, m: 0 }, oral: { e: 0, m: 0 } };
        filtered.forEach((s) => {
            const bid = String(s.block_id || '');
            const type = bid.startsWith('oral-') ? 'oral'
                : (s.comment ?? '').includes(AUTO_PREFIX) ? 'tests'
                    : 'written';
            b[type].e += s.score || 0;
            b[type].m += s.max_score || 100;
        });
        const pct = (e, m) => m > 0 ? Math.round((e / m) * 100) : 0;
        const tests = pct(b.tests.e, b.tests.m);
        const written = pct(b.written.e, b.written.m);
        const oral = pct(b.oral.e, b.oral.m);
        return { tests, written, oral, overall: Math.round((tests + written + oral) / 3), count: filtered.length };
    }
    async getGradedData(studentId) {
        const now = Date.now();
        const hit = this._gradedDataCache.get(studentId);
        if (hit && hit.exp > now)
            return hit;
        const [subs, attempts] = await Promise.all([
            this.prisma.submission.findMany({
                where: { user_id: studentId, status: 'GRADED' },
                select: {
                    score: true,
                    max_score: true,
                    block_id: true,
                    comment: true,
                    lesson: { select: { theme_id: true, theme: { select: { course_id: true } } } },
                },
            }),
            this.prisma.testAttempt.findMany({
                where: { user_id: studentId },
                select: { test_id: true, score: true },
                orderBy: { created_at: 'desc' },
            }),
        ]);
        const data = { subs, attempts, exp: now + 45_000 };
        this._gradedDataCache.set(studentId, data);
        return data;
    }
    invalidateGradedCache(studentId) {
        this._gradedDataCache.delete(studentId);
    }
    async calcStats(studentId, courseId, themeId) {
        const { subs } = await this.getGradedData(studentId);
        return this.computeStats(subs, {
            ...(themeId ? { themeId } : {}),
            ...(courseId ? { courseId } : {}),
        });
    }
    async getLessonBreakdown(studentId, themeId) {
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
        const done = new Set(subs.map((s) => s.lesson_id));
        return lessons.map((l) => ({ title: l.title, done: done.has(l.id), deadline: l.deadline }));
    }
    async getNearestCourseDeadline(courseId) {
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
        if (!lesson && !theme)
            return null;
        if (!lesson)
            return { title: theme.title, date: theme.deadline };
        if (!theme)
            return { title: lesson.title, date: lesson.deadline };
        return lesson.deadline < theme.deadline
            ? { title: lesson.title, date: lesson.deadline }
            : { title: theme.title, date: theme.deadline };
    }
    async calcStreak(studentId) {
        const [attempts, subs] = await Promise.all([
            this.prisma.testAttempt.findMany({ where: { user_id: studentId }, select: { created_at: true } }),
            this.prisma.submission.findMany({ where: { user_id: studentId }, select: { created_at: true } }),
        ]);
        const dates = [
            ...attempts.map((a) => new Date(a.created_at).setHours(0, 0, 0, 0)),
            ...subs.map((s) => new Date(s.created_at).setHours(0, 0, 0, 0)),
        ];
        const unique = [...new Set(dates)].sort((a, b) => b - a);
        if (!unique.length)
            return 0;
        const today = new Date().setHours(0, 0, 0, 0);
        const yesterday = today - 86400000;
        let check = unique[0] === today ? today : unique[0] === yesterday ? yesterday : null;
        if (check === null)
            return 0;
        let streak = 1;
        for (let i = 1; i < unique.length; i++) {
            if (unique[i] === check - 86400000) {
                streak++;
                check -= 86400000;
            }
            else
                break;
        }
        return streak;
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map