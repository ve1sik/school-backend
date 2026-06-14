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
exports.ThemeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ThemeService = class ThemeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureCanManageCourse(courseId, userId, userRole) {
        if (userRole === 'ADMIN')
            return;
        const course = await this.prisma.course.findFirst({
            where: {
                id: courseId,
                groups: {
                    some: {
                        OR: [
                            { curator_id: userId },
                            { teacher_id: userId },
                        ],
                    },
                },
            },
            select: { id: true },
        });
        if (!course)
            throw new common_1.ForbiddenException('Можно менять только назначенный курс');
    }
    async ensureCanManageTheme(themeId, userId, userRole) {
        if (userRole === 'ADMIN')
            return;
        const theme = await this.prisma.theme.findUnique({ where: { id: themeId }, select: { course_id: true } });
        if (!theme)
            throw new Error('Theme not found');
        await this.ensureCanManageCourse(theme.course_id, userId, userRole);
    }
    async create(dto, userId, userRole) {
        await this.ensureCanManageCourse(dto.courseId, userId, userRole);
        return this.prisma.theme.create({
            data: {
                course_id: dto.courseId,
                title: dto.title,
                order_index: dto.order_index,
            },
        });
    }
    async update(id, dto, userId, userRole) {
        await this.ensureCanManageTheme(id, userId, userRole);
        const { unlock_date, deadline, ...rest } = dto;
        return this.prisma.theme.update({
            where: { id },
            data: {
                ...rest,
                ...(unlock_date !== undefined ? { unlock_date: unlock_date ? new Date(unlock_date) : null } : {}),
                ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
            },
        });
    }
    async delete(id, userId, userRole) {
        await this.ensureCanManageTheme(id, userId, userRole);
        return this.prisma.theme.delete({
            where: { id },
        });
    }
    async reorder(id, newOrderIndex, userId, userRole) {
        await this.ensureCanManageTheme(id, userId, userRole);
        const theme = await this.prisma.theme.findUnique({ where: { id } });
        if (!theme)
            throw new Error('Theme not found');
        const oldOrderIndex = theme.order_index;
        const courseId = theme.course_id;
        await this.prisma.$transaction(async (prisma) => {
            if (oldOrderIndex < newOrderIndex) {
                await prisma.theme.updateMany({
                    where: { course_id: courseId, order_index: { gt: oldOrderIndex, lte: newOrderIndex } },
                    data: { order_index: { decrement: 1 } },
                });
            }
            else if (oldOrderIndex > newOrderIndex) {
                await prisma.theme.updateMany({
                    where: { course_id: courseId, order_index: { gte: newOrderIndex, lt: oldOrderIndex } },
                    data: { order_index: { increment: 1 } },
                });
            }
            await prisma.theme.update({
                where: { id },
                data: { order_index: newOrderIndex },
            });
        });
        return { success: true };
    }
};
exports.ThemeService = ThemeService;
exports.ThemeService = ThemeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ThemeService);
//# sourceMappingURL=theme.service.js.map