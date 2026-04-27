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
exports.SubmissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SubmissionsService = class SubmissionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createSubmission(userId, body) {
        return this.prisma.submission.create({
            data: {
                user_id: userId,
                lesson_id: body.lessonId,
                block_id: body.blockId,
                question: body.question,
                answer: body.answer,
                max_score: body.maxScore || 3,
                status: 'PENDING'
            }
        });
    }
    async getPendingSubmissions() {
        const subs = await this.prisma.submission.findMany({
            where: { status: 'PENDING' },
            include: {
                user: true,
                lesson: {
                    include: { theme: { include: { course: true } } }
                }
            },
            orderBy: { created_at: 'asc' }
        });
        return subs.map(sub => ({
            id: sub.id,
            studentName: sub.user.name ? `${sub.user.name} ${sub.user.surname || ''}`.trim() : 'Ученик',
            courseName: sub.lesson.theme.course.title,
            lessonTitle: sub.lesson.title,
            question: sub.question,
            answer: sub.answer,
            maxScore: sub.max_score,
            status: sub.status,
            date: new Date(sub.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        }));
    }
    async gradeSubmission(id, score, comment) {
        return this.prisma.submission.update({
            where: { id },
            data: {
                score,
                comment,
                status: 'GRADED'
            }
        });
    }
    async getSubmissionForStudent(lessonId, userId) {
        return this.prisma.submission.findFirst({
            where: {
                lesson_id: lessonId,
                user_id: userId,
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }
    async getMySubmissions(userId) {
        return this.prisma.submission.findMany({
            where: { user_id: userId },
        });
    }
};
exports.SubmissionsService = SubmissionsService;
exports.SubmissionsService = SubmissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubmissionsService);
//# sourceMappingURL=submissions.service.js.map