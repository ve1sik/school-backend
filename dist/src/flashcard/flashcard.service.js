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
exports.FlashcardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const NEW_PER_DAY = 20;
const REVIEW_PER_DAY = 50;
function calcNextReview(rating, interval, easeFactor, repetitions) {
    let newInterval = interval;
    let newEase = easeFactor;
    let newReps = repetitions;
    if (rating === 0) {
        newInterval = 1;
        newReps = 0;
    }
    else if (rating === 1) {
        newInterval = Math.max(1, Math.ceil(interval * 1.2));
        newReps = repetitions + 1;
    }
    else {
        if (repetitions === 0)
            newInterval = 1;
        else if (repetitions === 1)
            newInterval = 4;
        else
            newInterval = Math.ceil(interval * easeFactor);
        newEase = Math.min(3.0, easeFactor + 0.1);
        newReps = repetitions + 1;
    }
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
    return { interval: newInterval, easeFactor: newEase, nextReviewAt, repetitions: newReps };
}
let FlashcardService = class FlashcardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDueCards(userId, deckId) {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const deckFilter = deckId ? { deck_id: deckId } : {};
        const reviewCards = await this.prisma.flashcard.findMany({
            where: {
                ...deckFilter,
                progress: {
                    some: {
                        user_id: userId,
                        next_review_at: { lte: now },
                        repetitions: { gt: 0 },
                    },
                },
            },
            include: {
                progress: { where: { user_id: userId } },
                deck: { select: { title: true } },
            },
            take: REVIEW_PER_DAY,
        });
        const newCards = await this.prisma.flashcard.findMany({
            where: {
                ...deckFilter,
                progress: { none: { user_id: userId } },
            },
            include: {
                deck: { select: { title: true } },
            },
            take: NEW_PER_DAY,
        });
        return {
            review: reviewCards.map((c) => ({ ...c, isNew: false })),
            new: newCards.map((c) => ({ ...c, progress: [], isNew: true })),
            totalDue: reviewCards.length + newCards.length,
        };
    }
    async submitReview(userId, flashcardId, rating) {
        const existing = await this.prisma.flashcardProgress.findUnique({
            where: { user_id_flashcard_id: { user_id: userId, flashcard_id: flashcardId } },
        });
        const current = existing ?? { interval: 1, ease_factor: 2.5, repetitions: 0 };
        const { interval, easeFactor, nextReviewAt, repetitions } = calcNextReview(rating, current.interval, current.ease_factor, current.repetitions);
        return this.prisma.flashcardProgress.upsert({
            where: { user_id_flashcard_id: { user_id: userId, flashcard_id: flashcardId } },
            create: {
                user_id: userId,
                flashcard_id: flashcardId,
                interval,
                ease_factor: easeFactor,
                next_review_at: nextReviewAt,
                last_reviewed_at: new Date(),
                repetitions,
            },
            update: {
                interval,
                ease_factor: easeFactor,
                next_review_at: nextReviewAt,
                last_reviewed_at: new Date(),
                repetitions,
            },
        });
    }
    async getStats(userId) {
        const now = new Date();
        const totalLearned = await this.prisma.flashcardProgress.count({
            where: { user_id: userId, repetitions: { gt: 0 } },
        });
        const dueTodayCount = await this.prisma.flashcardProgress.count({
            where: { user_id: userId, next_review_at: { lte: now } },
        });
        const newCount = await this.prisma.flashcard.count({
            where: { progress: { none: { user_id: userId } } },
        });
        const recentReviews = await this.prisma.flashcardProgress.findMany({
            where: { user_id: userId, last_reviewed_at: { not: null } },
            select: { last_reviewed_at: true },
            distinct: ['last_reviewed_at'],
            orderBy: { last_reviewed_at: 'desc' },
            take: 365,
        });
        const streak = calcStreak(recentReviews.map((r) => r.last_reviewed_at));
        return { totalLearned, dueTodayCount, newCount: Math.min(newCount, NEW_PER_DAY), streak };
    }
};
exports.FlashcardService = FlashcardService;
exports.FlashcardService = FlashcardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FlashcardService);
function calcStreak(dates) {
    if (!dates.length)
        return 0;
    const days = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        if (days.has(key))
            streak++;
        else if (i > 0)
            break;
    }
    return streak;
}
//# sourceMappingURL=flashcard.service.js.map