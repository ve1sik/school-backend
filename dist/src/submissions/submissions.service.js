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
exports.SubmissionsService = exports.AUTO_GRADE_COMMENT_PREFIX = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const telegram_service_1 = require("../telegram/telegram.service");
exports.AUTO_GRADE_COMMENT_PREFIX = '🤖 Автоматическая проверка';
let SubmissionsService = class SubmissionsService {
    constructor(prisma, telegramService) {
        this.prisma = prisma;
        this.telegramService = telegramService;
    }
    async canGradeStudentLesson(studentId, lessonId, requesterId, requesterRole) {
        if (requesterRole === 'ADMIN')
            return true;
        if (!requesterId || !['CURATOR', 'TEACHER'].includes(requesterRole || ''))
            return false;
        const group = await this.prisma.group.findFirst({
            where: {
                students: { some: { id: studentId } },
                ...(requesterRole === 'CURATOR' ? { curator_id: requesterId } : { teacher_id: requesterId }),
                courses: {
                    some: {
                        themes: {
                            some: {
                                lessons: { some: { id: lessonId } },
                            },
                        },
                    },
                },
            },
            select: { id: true },
        });
        return !!group;
    }
    mapSubmissionForCurator(sub) {
        const isAutoGraded = sub.status === 'GRADED' &&
            typeof sub.comment === 'string' &&
            sub.comment.includes(exports.AUTO_GRADE_COMMENT_PREFIX);
        return {
            id: sub.id,
            studentId: sub.user_id,
            studentName: sub.user.name
                ? `${sub.user.name} ${sub.user.surname || ''}`.trim()
                : sub.user.email || 'Ученик',
            courseName: sub.lesson?.theme?.course?.title || 'Неизвестный курс',
            lessonTitle: sub.lesson?.title || 'Неизвестный урок',
            lessonId: sub.lesson_id || sub.lesson?.id || null,
            blockId: sub.block_id,
            question: sub.question,
            answer: sub.answer,
            maxScore: sub.max_score,
            score: sub.score,
            comment: sub.comment,
            status: sub.status,
            isAutoGraded,
            updated_at: sub.updated_at,
            created_at: sub.created_at,
            date: new Date(sub.created_at).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        };
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
                status: 'PENDING',
            },
        });
    }
    async createAutoGradedSubmission(userId, body, score, isSuccess) {
        const comment = isSuccess
            ? `${exports.AUTO_GRADE_COMMENT_PREFIX}: Верно!`
            : `${exports.AUTO_GRADE_COMMENT_PREFIX}: Неверно. Попытки исчерпаны.`;
        const submission = await this.prisma.submission.create({
            data: {
                user_id: userId,
                lesson_id: body.lessonId,
                block_id: body.blockId,
                question: body.question,
                answer: body.answer,
                max_score: body.maxScore || 3,
                score,
                comment,
                status: 'GRADED',
            },
        });
        if (isSuccess) {
            await this.awardPoints(userId, 15);
        }
        await this.telegramService.notifySubmissionGraded(submission.id, 'written');
        return submission;
    }
    async createOralSubmission(body, requesterId, requesterRole) {
        const studentId = body.studentId || body.userId;
        const lessonId = body.lessonId;
        if (!studentId || !lessonId) {
            throw new Error('studentId и lessonId обязательны');
        }
        const canGrade = await this.canGradeStudentLesson(studentId, lessonId, requesterId, requesterRole);
        if (!canGrade)
            throw new common_1.ForbiddenException('Нет доступа к этому ученику или уроку');
        const blockId = body.blockId || `oral-${lessonId}`;
        const existing = await this.prisma.submission.findFirst({
            where: {
                user_id: studentId,
                lesson_id: lessonId,
                block_id: blockId,
            },
            orderBy: { created_at: 'desc' },
        });
        const data = {
            user_id: studentId,
            lesson_id: lessonId,
            block_id: blockId,
            question: body.question || 'Устный ответ',
            answer: body.answer || body.comment || 'Устный ответ',
            max_score: body.maxScore || 100,
            score: Number(body.score) || 0,
            comment: body.comment || 'Устный ответ',
            status: 'GRADED',
        };
        if (existing) {
            const updated = await this.prisma.submission.update({
                where: { id: existing.id },
                data,
            });
            await this.telegramService.notifySubmissionGraded(updated.id, 'oral');
            return updated;
        }
        const created = await this.prisma.submission.create({ data });
        await this.telegramService.notifySubmissionGraded(created.id, 'oral');
        return created;
    }
    async getOralSubmission(studentId, lessonId, requesterId, requesterRole) {
        const canGrade = await this.canGradeStudentLesson(studentId, lessonId, requesterId, requesterRole);
        if (!canGrade)
            return null;
        return this.prisma.submission.findFirst({
            where: {
                user_id: studentId,
                lesson_id: lessonId,
                block_id: `oral-${lessonId}`,
            },
            orderBy: { updated_at: 'desc' },
        });
    }
    async awardPoints(userId, amount) {
        if (!amount || amount <= 0)
            return;
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: { points: { increment: amount } },
            });
        }
        catch {
        }
    }
    async getSubmissionsByStatus(status, requesterId, requesterRole) {
        const statusClause = status === 'PENDING'
            ? {
                OR: [
                    { status: 'PENDING' },
                    {
                        status: 'GRADED',
                        comment: { contains: exports.AUTO_GRADE_COMMENT_PREFIX },
                    },
                ],
            }
            : { status: 'GRADED' };
        const scopeClause = requesterRole === 'CURATOR' && requesterId
            ? {
                AND: [
                    { user: { groups: { some: { curator_id: requesterId } } } },
                    { lesson: { theme: { course: { groups: { some: { curator_id: requesterId } } } } } },
                ],
            }
            : {};
        const where = { ...statusClause, ...scopeClause };
        const subs = await this.prisma.submission.findMany({
            where,
            include: {
                user: true,
                lesson: {
                    include: { theme: { include: { course: true } } },
                },
            },
            orderBy: { created_at: 'desc' },
        });
        return subs.map((sub) => this.mapSubmissionForCurator(sub));
    }
    async gradeSubmission(id, score, comment, status) {
        const finalStatus = status === 'REVISION' ? 'REVISION' : 'GRADED';
        const existing = await this.prisma.submission.findUnique({ where: { id } });
        const finalComment = comment?.trim() ? comment : existing?.comment || '';
        const updated = await this.prisma.submission.update({
            where: { id },
            data: {
                score: finalStatus === 'REVISION' ? null : score,
                comment: finalComment,
                status: finalStatus,
            },
        });
        if (finalStatus === 'GRADED' &&
            existing?.status !== 'GRADED' &&
            typeof score === 'number' &&
            score > 0) {
            const pts = Math.round((score / (updated.max_score || 1)) * 30);
            await this.awardPoints(updated.user_id, pts);
        }
        if (finalStatus === 'GRADED') {
            await this.telegramService.notifySubmissionGraded(updated.id, 'written');
        }
        return updated;
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
            orderBy: { updated_at: 'desc' },
        });
    }
};
exports.SubmissionsService = SubmissionsService;
exports.SubmissionsService = SubmissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        telegram_service_1.TelegramService])
], SubmissionsService);
//# sourceMappingURL=submissions.service.js.map