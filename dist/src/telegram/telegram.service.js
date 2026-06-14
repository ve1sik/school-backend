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
const fs_1 = require("fs");
const path_1 = require("path");
const MAIN_KEYBOARD = {
    keyboard: [
        [{ text: '📊 Статистика' }, { text: '📅 Дедлайны' }],
        [{ text: '👤 Мой профиль' }, { text: '📚 Мои курсы' }],
        [{ text: '🔔 Уведомления' }, { text: '❓ Помощь' }],
    ],
    resize_keyboard: true,
    persistent: true,
};
const AUTO_PREFIX = 'Автоматическая проверка';
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
        this.linksPath = (0, path_1.join)(process.cwd(), 'telegram-links.json');
    }
    onModuleInit() {
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
    async registerBotCommands() {
        if (!this.token)
            return;
        try {
            await axios_1.default.post(`https://api.telegram.org/bot${this.token}/setMyCommands`, {
                commands: [
                    { command: 'start', description: '🏠 Начало / главное меню' },
                    { command: 'stats', description: '📊 Статистика по курсам' },
                    { command: 'deadlines', description: '📅 Ближайшие дедлайны' },
                    { command: 'profile', description: '👤 Мой профиль' },
                    { command: 'courses', description: '📚 Список моих курсов' },
                    { command: 'help', description: '❓ Помощь' },
                ],
            }, { timeout: 8000 });
        }
        catch { }
    }
    loadLinks() {
        try {
            if (!(0, fs_1.existsSync)(this.linksPath))
                return {};
            return JSON.parse((0, fs_1.readFileSync)(this.linksPath, 'utf8')) || {};
        }
        catch {
            return {};
        }
    }
    saveLinks(links) {
        (0, fs_1.writeFileSync)(this.linksPath, JSON.stringify(links, null, 2));
    }
    buildCode(userId) {
        return `TG${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    }
    async ensureTelegramCode(userId) {
        const code = this.buildCode(userId);
        return { code, botUrl: this.botUrl, linked: !!this.loadLinks()[code] };
    }
    getChatIdForUser(userId) {
        return this.loadLinks()[this.buildCode(userId)]?.chatId || null;
    }
    async findUserByCode(code) {
        const all = await this.prisma.user.findMany({
            select: { id: true, email: true, name: true, surname: true, role: true },
        });
        return all.find((u) => this.buildCode(u.id) === code) || null;
    }
    async findUserByChatId(chatId) {
        const link = Object.values(this.loadLinks()).find((l) => l.chatId === chatId);
        if (!link)
            return null;
        return this.prisma.user.findUnique({
            where: { id: link.userId },
            include: { parent: true },
        });
    }
    async pushMessage(chatId, text, extra) {
        if (!this.token)
            return;
        const reply_markup = extra?.buttons
            ? { inline_keyboard: extra.buttons }
            : extra?.keyboard
                ? MAIN_KEYBOARD
                : undefined;
        try {
            await axios_1.default.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup,
            }, { timeout: 10000 });
        }
        catch (e) {
            this.logger.warn(`Push failed: ${e?.message}`);
        }
    }
    reply(chatId, text, extra) {
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
    async answerCbq(callbackQueryId) {
        if (!this.token)
            return;
        try {
            await axios_1.default.post(`https://api.telegram.org/bot${this.token}/answerCallbackQuery`, { callback_query_id: callbackQueryId }, { timeout: 5000 });
        }
        catch { }
    }
    async handleUpdate(update) {
        try {
            if (update.message) {
                return await this.handleMessage(String(update.message.chat.id), String(update.message.text || '').trim());
            }
            if (update.callback_query) {
                this.answerCbq(update.callback_query.id);
                return await this.handleCallback(String(update.callback_query.message.chat.id), String(update.callback_query.data || ''));
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
            return this.handleStart(chatId, clean);
        if (cmd === 'stats')
            return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
        if (cmd === 'deadlines')
            return this.requireLinked(chatId, (s) => this.showDeadlines(chatId, s.id));
        if (cmd === 'profile')
            return this.requireLinked(chatId, (s) => this.showProfile(chatId, s));
        if (cmd === 'courses')
            return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
        if (cmd === 'help')
            return this.showHelp(chatId);
        if (text === '📊 Статистика')
            return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
        if (text === '📅 Дедлайны')
            return this.requireLinked(chatId, (s) => this.showDeadlines(chatId, s.id));
        if (text === '👤 Мой профиль')
            return this.requireLinked(chatId, (s) => this.showProfile(chatId, s));
        if (text === '📚 Мои курсы')
            return this.requireLinked(chatId, (s) => this.showCourseList(chatId, s.id));
        if (text === '🔔 Уведомления')
            return this.requireLinked(chatId, (s) => this.showNotifSettings(chatId));
        if (text === '❓ Помощь')
            return this.showHelp(chatId);
        const codeMatch = clean.match(/^(?:\/start\s+)?([A-Z0-9]{10,16})$/);
        if (codeMatch)
            return this.handleLinkCode(chatId, codeMatch[1].toUpperCase());
        return this.handleStart(chatId, clean);
    }
    async handleCallback(chatId, data) {
        const linked = await this.findUserByChatId(chatId);
        if (!linked)
            return this.reply(chatId, '⚠️ Сначала отправьте Telegram-код с сайта.');
        const student = await this.resolveStudent(linked);
        if (!student)
            return this.reply(chatId, 'К аккаунту родителя пока не привязан ученик.\n\nОткройте «Кабинет родителя» на сайте.');
        if (data === 'stats')
            return this.showCourseList(chatId, student.id);
        if (data === 'deadlines')
            return this.showDeadlines(chatId, student.id);
        if (data === 'home')
            return this.showHome(chatId, linked, student);
        if (data === 'profile')
            return this.showProfile(chatId, student);
        if (data === 'courses')
            return this.showCourseList(chatId, student.id);
        if (data.startsWith('course:'))
            return this.showCourseStats(chatId, student.id, data.slice(7));
        if (data.startsWith('theme:'))
            return this.showThemeStats(chatId, student.id, data.slice(6));
        return this.reply(chatId, '❓ Не понял команду. Используйте кнопки меню.');
    }
    async requireLinked(chatId, fn) {
        const linked = await this.findUserByChatId(chatId);
        if (!linked)
            return this.sendWelcome(chatId);
        const student = await this.resolveStudent(linked);
        if (!student)
            return this.reply(chatId, 'К аккаунту родителя пока не привязан ученик.', { keyboard: false });
        return fn(student);
    }
    async resolveStudent(user) {
        if (user.role !== 'PARENT')
            return user;
        return this.prisma.user.findFirst({ where: { parent_id: user.id } });
    }
    userName(u) {
        return `${u?.surname ?? ''} ${u?.name ?? u?.email ?? 'Пользователь'}`.trim();
    }
    async getStudentCourses(studentId) {
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
        const map = new Map();
        enrollments.forEach((e) => map.set(e.course_id, e.course));
        groups.forEach((g) => g.courses.forEach((c) => map.set(c.id, c)));
        return Array.from(map.values());
    }
    sendWelcome(chatId) {
        return this.reply(chatId, '👋 <b>Привет! Я бот школы «Препод из МГУ».</b>\n\n' +
            'Я помогу вам:\n' +
            '📊 Смотреть статистику и оценки\n' +
            '📅 Следить за дедлайнами\n' +
            '🔔 Получать уведомления от куратора\n\n' +
            '📌 <b>Чтобы начать — введите ваш Telegram-код.</b>\n' +
            'Код находится:\n' +
            '• Ученик → <b>Мой профиль</b> → блок «Telegram бот»\n' +
            '• Родитель → <b>Кабинет родителя</b> → блок «Telegram бот»', { keyboard: false });
    }
    async handleStart(chatId, text) {
        const deepCode = text.replace('/start', '').trim().toUpperCase();
        if (deepCode && deepCode.startsWith('TG')) {
            return this.handleLinkCode(chatId, deepCode);
        }
        const linked = await this.findUserByChatId(chatId);
        if (!linked)
            return this.sendWelcome(chatId);
        const student = await this.resolveStudent(linked);
        return this.showHome(chatId, linked, student);
    }
    async handleLinkCode(chatId, code) {
        const user = await this.findUserByCode(code);
        if (!user) {
            return this.reply(chatId, '❌ <b>Код не найден.</b>\n\nПроверьте код на сайте и попробуйте снова.', { keyboard: false });
        }
        const links = this.loadLinks();
        links[code] = { chatId, userId: user.id, linkedAt: new Date().toISOString() };
        this.saveLinks(links);
        const student = user.role === 'PARENT'
            ? await this.prisma.user.findFirst({ where: { parent_id: user.id } })
            : user;
        const roleLabel = user.role === 'PARENT' ? 'Родитель' : 'Ученик';
        return this.reply(chatId, `✅ <b>Аккаунт успешно привязан!</b>\n\n` +
            `${roleLabel}: <b>${esc(this.userName(user))}</b>\n` +
            (student && student.id !== user.id ? `👤 Ученик: <b>${esc(this.userName(student))}</b>\n` : '') +
            `\nТеперь вам будут приходить уведомления об оценках и напоминания о дедлайнах.\n\n` +
            `Используйте кнопки меню ниже 👇`, { buttons: [[{ text: '📊 Открыть статистику', callback_data: 'stats' }]] });
    }
    async showHome(chatId, linked, student) {
        if (!student)
            return this.reply(chatId, 'Добро пожаловать! Используйте меню ниже.');
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
    async showHelp(chatId) {
        return this.reply(chatId, `❓ <b>Помощь</b>\n${'─'.repeat(26)}\n\n` +
            `<b>Команды:</b>\n` +
            `/start — главное меню\n` +
            `/stats — статистика\n` +
            `/deadlines — дедлайны\n` +
            `/profile — мой профиль\n` +
            `/courses — список курсов\n` +
            `/help — эта справка\n\n` +
            `<b>Или используйте кнопки меню</b> — они всегда внизу экрана.\n\n` +
            `Если бот завис — нажмите /start для сброса.`);
    }
    async showNotifSettings(chatId) {
        return this.reply(chatId, `🔔 <b>Уведомления включены</b>\n\n` +
            `Вы получаете уведомления:\n` +
            `✅ Когда куратор проверил задание\n` +
            `✅ Когда выставлен балл за устный ответ\n` +
            `✅ Напоминания о дедлайнах (каждый день в 9:00)\n\n` +
            `Уведомления работают автоматически, пока ваш аккаунт привязан.`);
    }
    async showProfile(chatId, student) {
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
        let text = `👤 <b>${esc(this.userName(student))}</b>\n` +
            `${'─'.repeat(28)}\n\n` +
            `📚 Курсов: <b>${courses.length}</b>\n` +
            (groups.length ? `👥 Групп: <b>${groups.map((g) => g.title).join(', ')}</b>\n` : '') +
            `\n${medal(summary.overall)} <b>Общий балл: ${summary.overall}/100</b>\n` +
            `${bar(summary.overall)}\n\n` +
            `📝 Работ проверено: <b>${subs}</b>\n` +
            `🧩 Тестов пройдено: <b>${attempts}</b>\n` +
            (streakDays > 0 ? `🔥 Стрик: <b>${streakDays} дн.</b> подряд\n` : '');
        return this.reply(chatId, text, {
            buttons: [
                [{ text: '📊 Статистика', callback_data: 'stats' }],
                [{ text: '📅 Дедлайны', callback_data: 'deadlines' }],
            ],
        });
    }
    async showCourseList(chatId, studentId) {
        const courses = await this.getStudentCourses(studentId);
        if (!courses.length) {
            return this.reply(chatId, '📚 Вы пока не записаны ни на один курс.\n\nОткройте магазин на сайте и подайте заявку на вступление в группу.');
        }
        const statsArr = await Promise.all(courses.map((c) => this.calcStats(studentId, c.id)));
        const summary = statsArr.reduce((acc, s) => acc + s.overall, 0);
        const avg = Math.round(summary / statsArr.length);
        let text = `📚 <b>Мои курсы</b>  ${trend(avg)}\n` +
            `${'─'.repeat(28)}\n\n` +
            `${medal(avg)} <b>Средний балл: ${avg}/100</b>\n` +
            `${bar(avg)}\n\n` +
            `<b>Выберите курс:</b>`;
        const buttons = courses.map((c, i) => {
            const s = statsArr[i];
            const emoji = s.overall >= 75 ? '🟢' : s.overall >= 50 ? '🟡' : s.count > 0 ? '🔴' : '⬜';
            return [{ text: `${emoji} ${c.title} — ${s.overall}/100`, callback_data: `course:${c.id}` }];
        });
        buttons.push([{ text: '📅 Дедлайны', callback_data: 'deadlines' }]);
        return this.reply(chatId, text, { buttons });
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
            return this.reply(chatId, 'Курс не найден.');
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
        const themeButtons = (course.themes || []).map((t) => [
            { text: `📌 ${t.title}`, callback_data: `theme:${t.id}` },
        ]);
        themeButtons.push([{ text: '📅 Все дедлайны курса', callback_data: 'deadlines' }], [{ text: '← Все курсы', callback_data: 'stats' }]);
        return this.reply(chatId, text, { buttons: themeButtons });
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
            return this.reply(chatId, 'Модуль не найден.');
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
                const icon = ls.done ? '✅' : '⬜';
                text += `${icon} ${esc(ls.title)}`;
                if (ls.deadline)
                    text += `  <i>${daysLeft(ls.deadline)}</i>`;
                text += '\n';
            }
        }
        if (theme.deadline) {
            text += `\n⏰ Дедлайн модуля: <b>${fmtDate(theme.deadline)}</b> — ${daysLeft(theme.deadline)}`;
        }
        return this.reply(chatId, text, {
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
            return this.reply(chatId, '✅ <b>Ближайшие 2 недели свободны!</b>\n\nНет ни дедлайнов, ни запланированных событий. Отличная работа!', { buttons: [[{ text: '← Назад к статистике', callback_data: 'stats' }]] });
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
        return this.reply(chatId, text, {
            buttons: [[{ text: '← Назад к статистике', callback_data: 'stats' }]],
        });
    }
    async notifySubmissionGraded(submissionId, kind = 'written') {
        const sub = await this.prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                user: { include: { parent: true } },
                lesson: { include: { theme: { include: { course: true } } } },
            },
        });
        if (!sub || sub.status !== 'GRADED')
            return;
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
        const recipients = [student, student.parent].filter(Boolean);
        await Promise.all(recipients.map(async (u) => {
            const chatId = this.getChatIdForUser(u.id);
            if (chatId)
                await this.pushMessage(chatId, text, { buttons });
        }));
    }
    async sendDeadlineReminders() {
        const links = this.loadLinks();
        if (!Object.keys(links).length)
            return;
        const now = new Date();
        const in3Days = new Date(now.getTime() + 3 * 86400000);
        for (const entry of Object.values(links)) {
            try {
                const user = await this.prisma.user.findUnique({ where: { id: entry.userId } });
                if (!user)
                    continue;
                const student = await this.resolveStudent(user);
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
                await this.pushMessage(entry.chatId, text, {
                    buttons: [[{ text: '📅 Все дедлайны', callback_data: 'deadlines' }]],
                });
            }
            catch (e) {
                this.logger.warn(`Reminder error for ${entry.userId}: ${e?.message}`);
            }
        }
    }
    async testSend(chatId) {
        await this.pushMessage(chatId, '✅ Тест: backend успешно отправляет сообщения в Telegram.');
        return { ok: true };
    }
    async buildOverallSummary(studentId, courseIds) {
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
        const latest = new Map();
        attempts.forEach((a) => { if (!latest.has(a.test_id))
            latest.set(a.test_id, a.score || 0); });
        let sum = 0;
        let cnt = 0;
        subs.forEach((s) => { sum += s.max_score > 0 ? ((s.score ?? 0) / s.max_score) * 100 : 0; cnt++; });
        latest.forEach((score) => { sum += Math.min(100, score); cnt++; });
        return { overall: cnt > 0 ? Math.round(sum / cnt) : 0 };
    }
    async calcStats(studentId, courseId, themeId) {
        const lessonFilter = {};
        if (themeId)
            lessonFilter.theme = { id: themeId };
        else if (courseId)
            lessonFilter.theme = { course_id: courseId };
        const subs = await this.prisma.submission.findMany({
            where: { user_id: studentId, status: 'GRADED', lesson: lessonFilter },
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
        const pct = (e, m) => m > 0 ? Math.round((e / m) * 100) : 0;
        const tests = pct(b.tests.e, b.tests.m);
        const written = pct(b.written.e, b.written.m);
        const oral = pct(b.oral.e, b.oral.m);
        return { tests, written, oral, overall: Math.round((tests + written + oral) / 3), count: subs.length };
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
        const doneLessons = new Set(subs.map((s) => s.lesson_id));
        return lessons.map((l) => ({ title: l.title, done: doneLessons.has(l.id), deadline: l.deadline }));
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
    async getAnyNearestDeadline(studentId) {
        const courses = await this.getStudentCourses(studentId);
        if (!courses.length)
            return null;
        const courseIds = courses.map((c) => c.id);
        const lesson = await this.prisma.lesson.findFirst({
            where: { deadline: { gte: new Date() }, is_visible: true, theme: { course_id: { in: courseIds } } },
            orderBy: { deadline: 'asc' },
            select: { title: true, deadline: true },
        });
        return lesson ? { title: lesson.title, date: lesson.deadline } : null;
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