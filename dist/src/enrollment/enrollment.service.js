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
exports.EnrollmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EnrollmentService = class EnrollmentService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enroll(userId, courseId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
        });
        if (!course)
            throw new common_1.BadRequestException('Курс не найден.');
        const existingEnrollment = await this.prisma.enrollment.findFirst({
            where: { user_id: userId, course_id: courseId },
        });
        if (existingEnrollment)
            throw new common_1.BadRequestException('Вы уже записаны на этот курс.');
        return this.prisma.enrollment.create({
            data: {
                user: { connect: { id: userId } },
                course: { connect: { id: courseId } },
            },
            include: {
                course: true,
            }
        });
    }
    async getMyCourses(userId) {
        return this.prisma.enrollment.findMany({
            where: { user_id: userId },
            include: {
                course: true,
            },
        });
    }
};
exports.EnrollmentService = EnrollmentService;
exports.EnrollmentService = EnrollmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EnrollmentService);
//# sourceMappingURL=enrollment.service.js.map