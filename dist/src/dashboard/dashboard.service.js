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
const AUTO_GRADE_PREFIX = 'Автоматическая проверка';
let DashboardService = class DashboardService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
    }
    submissionType(blockId, comment) {
        const bid = String(blockId || '');
        if (bid.startsWith('oral-'))
            return 'oral';
        if (String(comment ?? '').includes(AUTO_GRADE_PREFIX))
            return 'tests';
        return 'written';
    }
    bucketPct(bucket) {
        return bucket.max > 0 ? Math.round((bucket.earned / bucket.max) * 100) : 0;
    }
    emptyBuckets() {
        return {
            tests: { earned: 0, max: 0, count: 0 },
            written: { earned: 0, max: 0, count: 0 },
            oral: { earned: 0, max: 0, count: 0 },
        };
    }
    addToBucket(buckets, type, earned, max) {
        buckets[type].earned += earned;
        buckets[type].max += max;
        buckets[type].count += 1;
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
                studentName, isLinked, totalTests: 0, averageScore: 0, gradedCount: 0,
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
        const globalBuckets = this.emptyBuckets();
        const themeBuckets = {};
        const gradedItems = [];
        latestAttempts.forEach((a) => {
            if (!a.test?.theme)
                return;
            const pct = Math.min(100, Math.max(0, a.score || 0));
            this.addToBucket(globalBuckets, 'tests', pct, 100);
            gradedItems.push({
                percentage: pct,
                date: new Date(a.created_at),
                theme: a.test.theme,
                type: 'tests',
            });
            const tId = a.test.theme.id;
            if (!themeBuckets[tId]) {
                themeBuckets[tId] = { id: tId, title: a.test.theme.title, buckets: this.emptyBuckets() };
            }
            this.addToBucket(themeBuckets[tId].buckets, 'tests', pct, 100);
        });
        const gradedSubmissions = submissions.filter((s) => s.status === 'GRADED' && s.score !== null && s.max_score > 0);
        gradedSubmissions.forEach((s) => {
            if (!s.lesson?.theme)
                return;
            const type = this.submissionType(s.block_id, s.comment);
            const pct = Math.min(100, Math.max(0, (s.score / s.max_score) * 100));
            this.addToBucket(globalBuckets, type, s.score || 0, s.max_score || 100);
            gradedItems.push({
                percentage: pct,
                date: new Date(s.created_at),
                theme: s.lesson.theme,
                type,
            });
            const tId = s.lesson.theme.id;
            if (!themeBuckets[tId]) {
                themeBuckets[tId] = { id: tId, title: s.lesson.theme.title, buckets: this.emptyBuckets() };
            }
            this.addToBucket(themeBuckets[tId].buckets, type, s.score || 0, s.max_score || 100);
        });
        const breakdown = {
            tests: this.bucketPct(globalBuckets.tests),
            written: this.bucketPct(globalBuckets.written),
            oral: this.bucketPct(globalBuckets.oral),
        };
        const finalAverageScore = Math.round((breakdown.tests + breakdown.written + breakdown.oral) / 3);
        const gradedCount = globalBuckets.tests.count + globalBuckets.written.count + globalBuckets.oral.count;
        let weakestTheme = null;
        let lowestAvg = 101;
        const modules = [];
        for (const entry of Object.values(themeBuckets)) {
            const themeBreakdown = {
                tests: this.bucketPct(entry.buckets.tests),
                written: this.bucketPct(entry.buckets.written),
                oral: this.bucketPct(entry.buckets.oral),
            };
            const avg = Math.round((themeBreakdown.tests + themeBreakdown.written + themeBreakdown.oral) / 3);
            const themeGradedCount = entry.buckets.tests.count + entry.buckets.written.count + entry.buckets.oral.count;
            if (avg < lowestAvg && avg <= 75 && themeGradedCount > 0) {
                lowestAvg = avg;
                weakestTheme = { id: entry.id, title: entry.title, score: avg };
            }
            modules.push({
                id: entry.id,
                title: entry.title,
                averageScore: avg,
                totalTests: themeGradedCount,
                breakdown: themeBreakdown,
                activityData: [{ name: 'Выполнено', count: themeGradedCount }],
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
            { name: 'Тесты', count: globalBuckets.tests.count },
            { name: 'Письменные', count: globalBuckets.written.count },
            { name: 'Устные', count: globalBuckets.oral.count },
        ];
        const aiReport = await this.aiService.generateStrictReport(studentName, breakdown.tests, breakdown.written, breakdown.oral, weakestTheme?.title || null);
        return {
            studentName,
            isLinked,
            totalTests: attempts.length + submissions.length,
            gradedCount,
            averageScore: finalAverageScore,
            breakdown,
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
        const questionIds = answers.map((a) => a.questionId);
        const existingQuestions = await this.prisma.question.findMany({
            where: { id: { in: questionIds } },
            select: { id: true },
        });
        const existingIds = new Set(existingQuestions.map((q) => q.id));
        const questionsToCreate = answers
            .filter((a) => !existingIds.has(a.questionId))
            .map((a) => ({
            id: a.questionId,
            test_id: testId,
            content: a.questionText || 'Вопрос из урока',
        }));
        if (questionsToCreate.length > 0) {
            await this.prisma.question.createMany({ data: questionsToCreate, skipDuplicates: true });
        }
        const prevCount = await this.prisma.testAttempt.count({ where: { user_id: userId, test_id: testId } });
        if (prevCount === 0 && typeof score === 'number' && score > 0) {
            const pts = Math.round((Math.min(100, score) / 100) * 20);
            if (pts > 0) {
                try {
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: { points: { increment: pts } },
                    });
                }
                catch {
                }
            }
        }
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