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
exports.GamificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const DAY = 86400000;
let GamificationService = class GamificationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        const user = (await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, surname: true, avatar: true, points: true },
        }));
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        const points = user.points || 0;
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
        const perfectCount = gradedSubs.filter((s) => s.score != null && s.max_score > 0 && s.score >= s.max_score).length +
            attempts.filter((a) => a.score >= 100).length;
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
    async getLeaderboard(userId) {
        const groups = (await this.prisma.group.findMany({
            where: { students: { some: { id: userId } } },
            select: {
                students: { select: { id: true, name: true, surname: true, avatar: true, points: true } },
            },
        }));
        const map = new Map();
        for (const g of groups) {
            for (const s of g.students || [])
                map.set(s.id, s);
        }
        let students = Array.from(map.values());
        if (students.length === 0) {
            students = (await this.prisma.user.findMany({
                where: { role: 'STUDENT' },
                select: { id: true, name: true, surname: true, avatar: true, points: true },
                orderBy: { points: 'desc' },
                take: 20,
            }));
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
    computeStreak(timestamps) {
        if (timestamps.length === 0)
            return 0;
        const unique = [...new Set(timestamps)].sort((a, b) => b - a);
        const today = new Date().setHours(0, 0, 0, 0);
        const yesterday = today - DAY;
        let cursor = unique[0] === today ? today : unique[0] === yesterday ? yesterday : null;
        if (cursor === null)
            return 0;
        let streak = 1;
        for (let i = 1; i < unique.length; i++) {
            if (unique[i] === cursor - DAY) {
                streak++;
                cursor -= DAY;
            }
            else if (unique[i] === cursor) {
                continue;
            }
            else {
                break;
            }
        }
        return streak;
    }
    computeAchievements(stats) {
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
};
exports.GamificationService = GamificationService;
exports.GamificationService = GamificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GamificationService);
//# sourceMappingURL=gamification.service.js.map