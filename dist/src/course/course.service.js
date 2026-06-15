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
exports.CourseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CourseService = class CourseService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOne(id) {
        const course = await this.prisma.course.findUnique({
            where: { id },
            include: {
                themes: {
                    orderBy: { order_index: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { order_index: 'asc' },
                        },
                    },
                },
            },
        });
        if (!course)
            throw new common_1.NotFoundException('Курс не найден');
        return course;
    }
    async getAllCourses(userId, userRole) {
        if (userRole === 'ADMIN') {
            return this.prisma.course.findMany({
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
        if (userRole === 'CURATOR' && userId) {
            return this.prisma.course.findMany({
                where: {
                    groups: {
                        some: {
                            curator_id: userId,
                        },
                    },
                },
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
        if (userRole === 'TEACHER' && userId) {
            return this.prisma.course.findMany({
                where: {
                    groups: {
                        some: {
                            teacher_id: userId,
                        },
                    },
                },
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
        const [enrollments, groups] = await Promise.all([
            this.prisma.enrollment.findMany({
                where: { user_id: userId },
                select: { course_id: true },
            }),
            this.prisma.group.findMany({
                where: { students: { some: { id: userId } } },
                select: { courses: { select: { id: true } } },
            }),
        ]);
        const courseIdSet = new Set();
        enrollments.forEach(e => courseIdSet.add(e.course_id));
        groups.forEach(g => g.courses.forEach(c => courseIdSet.add(c.id)));
        if (courseIdSet.size === 0) {
            return [];
        }
        return this.prisma.course.findMany({
            where: { id: { in: [...courseIdSet] } },
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
    async create(dto) {
        return this.prisma.course.create({ data: dto });
    }
    async ensureCanManageCourse(id, userId, userRole) {
        if (userRole === 'ADMIN')
            return;
        if (!userId || !['CURATOR', 'TEACHER'].includes(userRole || '')) {
            throw new common_1.ForbiddenException('Нет доступа к курсу');
        }
        const groupRoleFilter = userRole === 'CURATOR' ? { curator_id: userId } : { teacher_id: userId };
        const course = await this.prisma.course.findFirst({
            where: {
                id,
                groups: {
                    some: groupRoleFilter,
                },
            },
            select: { id: true },
        });
        if (!course)
            throw new common_1.ForbiddenException('Можно менять только назначенный курс');
    }
    async updateCourse(id, dto, userId, userRole) {
        await this.ensureCanManageCourse(id, userId, userRole);
        const allowed = ['title', 'description', 'cover_url', 'spell_check', 'subject_id'];
        const data = {};
        for (const key of allowed) {
            if (key in dto)
                data[key] = dto[key];
        }
        return this.prisma.course.update({ where: { id }, data });
    }
    async delete(id) {
        const themes = await this.prisma.theme.findMany({ where: { course_id: id } });
        const themeIds = themes.map(t => t.id);
        if (themeIds.length > 0) {
            await this.prisma.lesson.deleteMany({
                where: { theme_id: { in: themeIds } }
            });
        }
        await this.prisma.theme.deleteMany({
            where: { course_id: id }
        });
        return this.prisma.course.delete({ where: { id } });
    }
};
exports.CourseService = CourseService;
exports.CourseService = CourseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CourseService);
//# sourceMappingURL=course.service.js.map