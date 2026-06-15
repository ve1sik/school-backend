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
const course_analytics_util_1 = require("./course-analytics.util");
let DashboardService = class DashboardService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
    }
    async loadStudentCourses(studentId) {
        const [enrollments, groups] = await Promise.all([
            this.prisma.enrollment.findMany({
                where: { user_id: studentId },
                select: { course_id: true },
            }),
            this.prisma.group.findMany({
                where: { students: { some: { id: studentId } } },
                select: { courses: { select: { id: true } } },
            }),
        ]);
        const courseIds = new Set();
        enrollments.forEach((e) => courseIds.add(e.course_id));
        groups.forEach((g) => g.courses.forEach((c) => courseIds.add(c.id)));
        if (!courseIds.size)
            return [];
        return this.prisma.course.findMany({
            where: { id: { in: [...courseIds] } },
            include: {
                themes: {
                    orderBy: { order_index: 'asc' },
                    include: {
                        lessons: { orderBy: { order_index: 'asc' } },
                    },
                },
            },
            orderBy: { title: 'asc' },
        });
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
        if (!isLinked) {
            return {
                studentName,
                isLinked: false,
                totalTests: 0,
                averageScore: 0,
                gradedCount: 0,
                breakdown: { tests: 0, written: 0, oral: 0 },
                streakDays: 0,
                weakestTheme: null,
                progressData: [],
                activityData: [],
                modules: [],
                aiReport: 'Привяжите аккаунт ребёнка по коду из его профиля.',
            };
        }
        const [courses, submissions, attempts] = await Promise.all([
            this.loadStudentCourses(targetUserId),
            this.prisma.submission.findMany({
                where: { user_id: targetUserId },
                orderBy: { updated_at: 'desc' },
            }),
            this.prisma.testAttempt.findMany({
                where: { user_id: targetUserId },
                orderBy: { created_at: 'desc' },
            }),
        ]);
        const courseStats = courses
            .map((course) => (0, course_analytics_util_1.buildCourseAnalytics)(course, submissions))
            .filter((stats) => !!stats);
        if (!courseStats.length) {
            return {
                studentName,
                isLinked: true,
                totalTests: submissions.length + attempts.length,
                averageScore: 0,
                gradedCount: 0,
                breakdown: { tests: 0, written: 0, oral: 0 },
                streakDays: 0,
                weakestTheme: null,
                progressData: [],
                activityData: [],
                modules: [],
                aiReport: 'Данные для анализа отсутствуют. Начните выполнение заданий.',
            };
        }
        const merged = (0, course_analytics_util_1.mergeCourseAnalytics)(courseStats);
        const dates = [
            ...attempts.map((a) => new Date(a.created_at).setHours(0, 0, 0, 0)),
            ...submissions.map((s) => new Date(s.created_at).setHours(0, 0, 0, 0)),
        ];
        const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);
        let streakDays = 0;
        const today = new Date().setHours(0, 0, 0, 0);
        const yesterday = today - 86400000;
        let currentDateCheck = uniqueDates[0] === today ? today : uniqueDates[0] === yesterday ? yesterday : null;
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
        const modules = merged.modules.map((m) => ({
            ...m,
            activityData: [{ name: 'Выполнено', count: m.totalTests }],
        }));
        const activityData = [
            { name: 'Тесты', count: courseStats.reduce((s, c) => s + c.buckets.tests.count, 0) },
            { name: 'Письменные', count: courseStats.reduce((s, c) => s + c.buckets.written.count, 0) },
            { name: 'Устные', count: courseStats.reduce((s, c) => s + c.buckets.oral.count, 0) },
        ];
        const aiReport = await this.aiService.generateStrictReport(studentName, merged.breakdown.tests, merged.breakdown.written, merged.breakdown.oral, merged.weakestTheme?.title || null);
        return {
            studentName,
            isLinked: true,
            totalTests: submissions.length + attempts.length,
            gradedCount: merged.gradedCount,
            averageScore: merged.averageScore,
            breakdown: merged.breakdown,
            streakDays,
            weakestTheme: merged.weakestTheme,
            progressData: [],
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