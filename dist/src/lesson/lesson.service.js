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
    async create(dto) {
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
            },
        });
    }
    async update(id, dto) {
        return this.prisma.lesson.update({
            where: { id },
            data: {
                title: dto.title,
                type: dto.type,
                video_url: dto.video_url,
                content: dto.content,
                test_data: dto.test_data,
                is_homework: dto.is_homework,
            },
        });
    }
    async getByTheme(themeId) {
        return this.prisma.lesson.findMany({
            where: { theme_id: themeId },
            orderBy: { order_index: 'asc' },
        });
    }
    async delete(id) {
        return this.prisma.lesson.delete({
            where: { id },
        });
    }
    async updateVisibility(id, is_visible) {
        return this.prisma.lesson.update({
            where: { id },
            data: { is_visible },
        });
    }
};
exports.LessonService = LessonService;
exports.LessonService = LessonService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LessonService);
//# sourceMappingURL=lesson.service.js.map