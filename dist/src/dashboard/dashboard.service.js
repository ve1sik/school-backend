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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("./ai.service");
let DashboardService = class DashboardService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
    }
    async getStudentAnalytics(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { children: true },
        });
        let targetUserId = userId;
        let studentName = user?.name || 'Ученик';
        let isLinked = true;
        if (user?.role === 'PARENT') {
            if (user.children && user.children.length > 0) {
                targetUserId = user.children[0].id;
                studentName = user.children[0].name || 'Ученик';
                isLinked = true;
            }
            else {
                isLinked = false;
            }
        }
        const attempts = await this.prisma.testAttempt.findMany({
            where: { user_id: targetUserId },
            orderBy: { created_at: 'desc' },
            include: { test: { include: { theme: true } } },
        });
        const submissions = await this.prisma.submission.findMany({
            where: { user_id: targetUserId },
            include: { lesson: { include: { theme: true } } }
        });
        if (attempts.length === 0 && submissions.length === 0) {
            return {
                studentName, isLinked, totalTests: 0, averageScore: 0,
                breakdown: { tests: 0, written: 0, oral: 0 },
                streakDays: 0, weakestTheme: null, progressData: [], activityData: [],
                modules: [],
                aiReport: 'Данные для анализа отсутствуют. Начните выполнение заданий, чтобы система смогла сформировать отчет.',
            };
        }
        const latestAttemptsMap = new Map();
        attempts.forEach((attempt) => {
            if (!latestAttemptsMap.has(attempt.test_id)) {
                latestAttemptsMap.set(attempt.test_id, attempt);
            }
        });
        const latestAttempts = Array.from(latestAttemptsMap.values());
        const gradedItems = [];
        latestAttempts.forEach((a) => {
            if (a.test?.theme) {
                gradedItems.push({
                    percentage: Math.min(100, Math.max(0, a.score)),
                    date: new Date(a.created_at),
                    theme: a.test.theme,
                    type: 'test'
                });
            }
        });
        const gradedSubmissions = submissions.filter(s => s.status === 'GRADED' && s.score !== null && s.max_score > 0);
        gradedSubmissions.forEach((s) => {
            if (s.lesson?.theme) {
                gradedItems.push({
                    percentage: Math.min(100, Math.max(0, (s.score / s.max_score) * 100)),
                    date: new Date(s.created_at),
                    theme: s.lesson.theme,
                    type: 'written'
                });
            }
        });
        const totalPercentage = gradedItems.reduce((sum, item) => sum + item.percentage, 0);
        const finalAverageScore = gradedItems.length > 0 ? Math.round(totalPercentage / gradedItems.length) : 0;
        const themeStats = {};
        gradedItems.forEach(item => {
            const tId = item.theme.id;
            if (!themeStats[tId]) {
                themeStats[tId] = { id: tId, title: item.theme.title, sum: 0, count: 0 };
            }
            themeStats[tId].sum += item.percentage;
            themeStats[tId].count += 1;
        });
        let weakestTheme = null;
        let lowestAvg = 101;
        const modules = [];
        for (const [id, data] of Object.entries(themeStats)) {
            const avg = Math.round(data.sum / data.count);
            if (avg < lowestAvg && avg <= 75) {
                lowestAvg = avg;
                weakestTheme = { id, title: data.title, score: avg };
            }
            modules.push({
                id: data.id,
                title: data.title,
                averageScore: avg,
                totalTests: data.count,
                breakdown: { tests: avg, written: avg, oral: 0 },
                activityData: [
                    { name: 'Выполнено', count: data.count }
                ]
            });
        }
        const dates = attempts.map((a) => new Date(a.created_at).setHours(0, 0, 0, 0));
        submissions.forEach(s => dates.push(new Date(s.created_at).setHours(0, 0, 0, 0)));
        const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);
        let streakDays = 0;
        const today = new Date().setHours(0, 0, 0, 0);
        const yesterday = today - 86400000;
        let currentDateCheck = uniqueDates[0] === today ? today : (uniqueDates[0] === yesterday ? yesterday : null);
        if (currentDateCheck !== null) {
            streakDays = 1;
            for (let i = 1; i < uniqueDates.length; i++) {
                if (uniqueDates[i] === currentDateCheck - 86400000) {
                    streakDays++;
                    currentDateCheck -= 86400000;
                }
                else
                    break;
            }
        }
        const progressData = [];
        const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        let cumulativeSum = 0;
        let cumulativeCount = 0;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        gradedItems.filter(i => i.date < sevenDaysAgo).forEach(i => {
            cumulativeSum += i.percentage;
            cumulativeCount++;
        });
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const startOfDay = new Date(d.setHours(0, 0, 0, 0));
            const endOfDay = new Date(d.setHours(23, 59, 59, 999));
            const dailyItems = gradedItems.filter(item => item.date >= startOfDay && item.date <= endOfDay);
            dailyItems.forEach(i => {
                cumulativeSum += i.percentage;
                cumulativeCount++;
            });
            const scoreOfDay = cumulativeCount > 0 ? Math.round(cumulativeSum / cumulativeCount) : 0;
            progressData.push({ name: daysOfWeek[d.getDay()], score: scoreOfDay });
        }
        const activityData = [
            { name: 'Тесты', count: latestAttempts.length },
            { name: 'Задания', count: submissions.length },
            { name: 'Опросы', count: 0 }
        ];
        const aiReport = await this.aiService.generateStrictReport(studentName, finalAverageScore, finalAverageScore, 0, weakestTheme?.title || null);
        return {
            studentName,
            isLinked,
            totalTests: attempts.length + submissions.length,
            averageScore: finalAverageScore,
            breakdown: { tests: finalAverageScore, written: finalAverageScore, oral: 0 },
            streakDays,
            weakestTheme,
            progressData,
            activityData,
            modules,
            aiReport,
        };
    }
    async getMistakesWork(userId, themeId) {
        const lastAttempt = await this.prisma.testAttempt.findFirst({
            where: { user_id: userId, test: { theme_id: themeId } },
            orderBy: { created_at: 'desc' },
            include: {
                answers: {
                    where: { is_correct: false },
                    include: { question: true },
                },
            },
        });
        if (!lastAttempt || lastAttempt.answers.length === 0) {
            return { hasMistakes: false, questions: [] };
        }
        return {
            hasMistakes: true,
            testId: lastAttempt.test_id,
            questions: lastAttempt.answers.map((ans) => ({
                questionId: ans.question.id,
                content: ans.question.content,
                yourWrongAnswer: ans.user_answer,
            })),
        };
    }
    async saveTestResult(userId, testId, score, answers) {
        let testRecord = await this.prisma.test.findUnique({ where: { id: testId } });
        if (!testRecord) {
            const lesson = await this.prisma.lesson.findUnique({ where: { id: testId } });
            if (!lesson)
                throw new Error('Lesson not found');
            testRecord = await this.prisma.test.create({
                data: {
                    id: testId,
                    title: lesson.title,
                    theme: { connect: { id: lesson.theme_id } },
                },
            });
        }
        for (const ans of answers) {
            const qExists = await this.prisma.question.findUnique({ where: { id: ans.questionId } });
            if (!qExists) {
                await this.prisma.question.create({
                    data: {
                        id: ans.questionId,
                        test: { connect: { id: testId } },
                        content: ans.questionText || 'Вопрос из урока',
                    },
                });
            }
        }
        const prevCount = await this.prisma.testAttempt.count({ where: { user_id: userId, test_id: testId } });
        return this.prisma.testAttempt.create({
            data: {
                user: { connect: { id: userId } },
                test: { connect: { id: testId } },
                score,
                attempt_number: prevCount + 1,
                answers: {
                    create: answers.map((ans) => ({
                        question: { connect: { id: ans.questionId } },
                        is_correct: ans.isCorrect,
                        user_answer: ans.userAnswer || '',
                    })),
                },
            },
        });
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map