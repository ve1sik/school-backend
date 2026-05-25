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
exports.GroupService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GroupService = class GroupService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        return this.prisma.group.create({ data });
    }
    async findAll() {
        return this.prisma.group.findMany({
            include: {
                _count: {
                    select: { students: true, courses: true }
                },
                curator: true
            }
        });
    }
    async findOne(id) {
        return this.prisma.group.findUnique({
            where: { id },
            include: { courses: true, students: true, curator: true }
        });
    }
    async update(id, data) {
        const { curator_id, ...rest } = data;
        const updateData = { ...rest };
        if (curator_id !== undefined) {
            if (curator_id === null || curator_id === '') {
                updateData.curator = { disconnect: true };
            }
            else {
                updateData.curator = { connect: { id: curator_id } };
            }
        }
        return this.prisma.group.update({
            where: { id },
            data: updateData
        });
    }
    async remove(id) {
        return this.prisma.group.delete({ where: { id } });
    }
    async updateCourses(groupId, courseIds) {
        const group = await this.prisma.group.update({
            where: { id: groupId },
            data: {
                courses: { set: courseIds.map(id => ({ id })) }
            },
            include: { students: true }
        });
        if (group.students.length > 0) {
            for (const student of group.students) {
                for (const courseId of courseIds) {
                    const existing = await this.prisma.enrollment.findFirst({
                        where: { user_id: student.id, course_id: courseId }
                    });
                    if (!existing) {
                        await this.prisma.enrollment.create({
                            data: { user_id: student.id, course_id: courseId }
                        });
                    }
                }
            }
        }
        return group;
    }
    async updateStudents(groupId, studentIds) {
        const group = await this.prisma.group.update({
            where: { id: groupId },
            data: {
                students: { set: studentIds.map(id => ({ id })) }
            },
            include: { courses: true }
        });
        if (group.courses.length > 0) {
            for (const studentId of studentIds) {
                for (const course of group.courses) {
                    const existing = await this.prisma.enrollment.findFirst({
                        where: { user_id: studentId, course_id: course.id }
                    });
                    if (!existing) {
                        await this.prisma.enrollment.create({
                            data: { user_id: studentId, course_id: course.id }
                        });
                    }
                }
            }
        }
        return group;
    }
    async removeStudent(groupId, userId) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: { students: { where: { id: userId } } },
        });
        if (!group)
            throw new common_1.NotFoundException('Группа не найдена');
        return this.prisma.group.update({
            where: { id: groupId },
            data: {
                students: { disconnect: { id: userId } },
            },
        });
    }
    async findShopGroups() {
        return this.prisma.group.findMany({
            where: {
                is_public: true,
                price: { gt: 0 }
            },
            include: {
                curator: { select: { name: true, surname: true, avatar: true } }
            }
        });
    }
    async enrollStudent(groupId, studentId) {
        const group = await this.prisma.group.update({
            where: { id: groupId },
            data: {
                students: { connect: { id: studentId } }
            },
            include: { courses: true }
        });
        if (group.courses.length > 0) {
            for (const course of group.courses) {
                const existing = await this.prisma.enrollment.findFirst({
                    where: { user_id: studentId, course_id: course.id }
                });
                if (!existing) {
                    await this.prisma.enrollment.create({
                        data: { user_id: studentId, course_id: course.id }
                    });
                }
            }
        }
        return { success: true, message: 'Студент успешно добавлен в группу и получил курсы' };
    }
};
exports.GroupService = GroupService;
exports.GroupService = GroupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupService);
//# sourceMappingURL=group.service.js.map