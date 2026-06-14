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
exports.LessonService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LessonService = class LessonService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureCanManageTheme(themeId, userId, userRole) {
        if (userRole === 'ADMIN')
            return;
        const theme = await this.prisma.theme.findFirst({
            where: {
                id: themeId,
                course: {
                    groups: {
                        some: {
                            OR: [
                                { curator_id: userId },
                                { teacher_id: userId },
                            ],
                        },
                    },
                },
            },
            select: { id: true },
        });
        if (!theme)
            throw new common_1.ForbiddenException('Можно менять только назначенный курс');
    }
    async ensureCanManageLesson(lessonId, userId, userRole) {
        if (userRole === 'ADMIN')
            return;
        const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { theme_id: true } });
        if (!lesson)
            throw new Error('Lesson not found');
        await this.ensureCanManageTheme(lesson.theme_id, userId, userRole);
    }
    async create(dto, userId, userRole) {
        await this.ensureCanManageTheme(dto.themeId, userId, userRole);
        return this.prisma.lesson.create({
            data: {
                title: dto.title,
                order_index: dto.order_index,
                theme_id: dto.themeId,
                type: dto.type || 'VIDEO',
                video_url: dto.video_url || null,
                content: dto.content || null,
                test_data: dto.test_data || null,
                is_homework: dto.is_homework || false,
                include_in_analytics: dto.include_in_analytics !== undefined ? dto.include_in_analytics : true,
                unlock_date: dto.unlock_date ? new Date(dto.unlock_date) : null,
                deadline: dto.deadline ? new Date(dto.deadline) : null,
            },
        });
    }
    async update(id, dto, userId, userRole) {
        await this.ensureCanManageLesson(id, userId, userRole);
        return this.prisma.lesson.update({
            where: { id },
            data: {
                title: dto.title,
                type: dto.type,
                video_url: dto.video_url,
                content: dto.content,
                test_data: dto.test_data,
                is_homework: dto.is_homework,
                ...(dto.include_in_analytics !== undefined ? { include_in_analytics: dto.include_in_analytics } : {}),
                ...(dto.unlock_date !== undefined ? { unlock_date: dto.unlock_date ? new Date(dto.unlock_date) : null } : {}),
                ...(dto.deadline !== undefined ? { deadline: dto.deadline ? new Date(dto.deadline) : null } : {}),
            },
        });
    }
    async reorder(id, newThemeId, newOrderIndex, userId, userRole) {
        await this.ensureCanManageLesson(id, userId, userRole);
        await this.ensureCanManageTheme(newThemeId, userId, userRole);
        const lesson = await this.prisma.lesson.findUnique({ where: { id } });
        if (!lesson)
            throw new Error('Lesson not found');
        const oldThemeId = lesson.theme_id;
        const oldOrderIndex = lesson.order_index;
        await this.prisma.$transaction(async (prisma) => {
            if (oldThemeId === newThemeId) {
                if (oldOrderIndex < newOrderIndex) {
                    await prisma.lesson.updateMany({
                        where: { theme_id: newThemeId, order_index: { gt: oldOrderIndex, lte: newOrderIndex } },
                        data: { order_index: { decrement: 1 } },
                    });
                }
                else if (oldOrderIndex > newOrderIndex) {
                    await prisma.lesson.updateMany({
                        where: { theme_id: newThemeId, order_index: { gte: newOrderIndex, lt: oldOrderIndex } },
                        data: { order_index: { increment: 1 } },
                    });
                }
            }
            else {
                await prisma.lesson.updateMany({
                    where: { theme_id: newThemeId, order_index: { gte: newOrderIndex } },
                    data: { order_index: { increment: 1 } },
                });
                await prisma.lesson.updateMany({
                    where: { theme_id: oldThemeId, order_index: { gt: oldOrderIndex } },
                    data: { order_index: { decrement: 1 } },
                });
            }
            await prisma.lesson.update({
                where: { id },
                data: { theme_id: newThemeId, order_index: newOrderIndex },
            });
        });
        return { success: true };
    }
    async getByTheme(themeId) {
        return this.prisma.lesson.findMany({
            where: { theme_id: themeId },
            orderBy: { order_index: 'asc' },
        });
    }
    async delete(id, userId, userRole) {
        await this.ensureCanManageLesson(id, userId, userRole);
        return this.prisma.lesson.delete({
            where: { id },
        });
    }
    async updateVisibility(id, is_visible, userId, userRole) {
        await this.ensureCanManageLesson(id, userId, userRole);
        return this.prisma.lesson.update({
            where: { id },
            data: { is_visible },
        });
    }
    async updateAnalyticsVisibility(id, include_in_analytics, userId, userRole) {
        await this.ensureCanManageLesson(id, userId, userRole);
        return this.prisma.lesson.update({
            where: { id },
            data: { include_in_analytics },
        });
    }
};
exports.LessonService = LessonService;
exports.LessonService = LessonService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LessonService);
//# sourceMappingURL=lesson.service.js.map