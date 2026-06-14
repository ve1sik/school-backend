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
    async findAll(requesterId, requesterRole, requesterPermissions = []) {
        const where = requesterRole === 'CURATOR' && requesterId
            ? { curator_id: requesterId }
            : requesterRole === 'TEACHER' && requesterId
                ? { teacher_id: requesterId }
                : {};
        return this.prisma.group.findMany({
            where,
            include: {
                _count: { select: { students: true, courses: true } },
                curator: true,
                teacher: true,
            }
        });
    }
    async findOne(id, requesterId, requesterRole, requesterPermissions = []) {
        const where = requesterRole === 'CURATOR' && requesterId
            ? { id, curator_id: requesterId }
            : requesterRole === 'TEACHER' && requesterId
                ? { id, teacher_id: requesterId }
                : { id };
        return this.prisma.group.findFirst({
            where,
            include: { courses: true, students: true, curator: true, teacher: true }
        });
    }
    async getCuratorScope(requesterId, requesterRole) {
        const where = requesterRole === 'ADMIN'
            ? {}
            : requesterRole === 'TEACHER'
                ? { teacher_id: requesterId }
                : { curator_id: requesterId };
        return this.prisma.group.findMany({
            where,
            include: {
                curator: { select: { id: true, name: true, surname: true, email: true } },
                teacher: { select: { id: true, name: true, surname: true, email: true } },
                students: {
                    select: { id: true, name: true, surname: true, email: true, avatar: true },
                    orderBy: [{ surname: 'asc' }, { name: 'asc' }],
                },
                courses: {
                    include: {
                        themes: {
                            orderBy: { order_index: 'asc' },
                            include: {
                                lessons: { orderBy: { order_index: 'asc' } },
                            },
                        },
                    },
                    orderBy: { title: 'asc' },
                },
            },
            orderBy: { title: 'asc' },
        });
    }
    async update(id, data, requesterId, requesterRole, requesterPermissions = []) {
        const { curator_id, curatorId, teacherId, ...rest } = data;
        const updateData = { ...rest };
        if (requesterRole === 'CURATOR' && !requesterPermissions.includes('MANAGE_GROUPS')) {
            const group = await this.prisma.group.findUnique({ where: { id }, select: { curator_id: true } });
            if (!group || group.curator_id !== requesterId) {
                throw new common_1.ForbiddenException('Можно менять только свою группу');
            }
            Object.keys(updateData).forEach((key) => delete updateData[key]);
        }
        const effectiveCuratorId = curatorId ?? curator_id;
        if (requesterRole !== 'CURATOR' && effectiveCuratorId !== undefined) {
            if (effectiveCuratorId === null || effectiveCuratorId === '') {
                updateData.curator = { disconnect: true };
            }
            else {
                updateData.curator = { connect: { id: effectiveCuratorId } };
            }
        }
        if (teacherId !== undefined) {
            if (teacherId === null || teacherId === '') {
                updateData.teacher = { disconnect: true };
            }
            else {
                updateData.teacher = { connect: { id: teacherId } };
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
        if (group.students.length > 0 && courseIds.length > 0) {
            const data = group.students.flatMap((student) => courseIds.map((courseId) => ({ user_id: student.id, course_id: courseId })));
            await this.prisma.enrollment.createMany({ data, skipDuplicates: true });
        }
        return group;
    }
    async updateStudents(groupId, studentIds, requesterId, requesterRole) {
        return this.updateStudentsScoped(groupId, studentIds, requesterId, requesterRole);
    }
    async ensureCanManageGroupMembers(groupId, requesterId, requesterRole) {
        if (!requesterId || requesterRole !== 'CURATOR')
            return;
        const group = await this.prisma.group.findFirst({
            where: { id: groupId, curator_id: requesterId },
            select: { id: true },
        });
        if (!group)
            throw new common_1.ForbiddenException('Можно менять участников только своей группы');
    }
    async updateStudentsScoped(groupId, studentIds, requesterId, requesterRole) {
        await this.ensureCanManageGroupMembers(groupId, requesterId, requesterRole);
        const group = await this.prisma.group.update({
            where: { id: groupId },
            data: {
                students: { set: studentIds.map(id => ({ id })) }
            },
            include: { courses: true }
        });
        if (group.courses.length > 0 && studentIds.length > 0) {
            const data = studentIds.flatMap((studentId) => group.courses.map((course) => ({ user_id: studentId, course_id: course.id })));
            await this.prisma.enrollment.createMany({ data, skipDuplicates: true });
        }
        return group;
    }
    async removeStudent(groupId, userId, requesterId, requesterRole) {
        await this.ensureCanManageGroupMembers(groupId, requesterId, requesterRole);
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
    async getMyThemeAccess(userId) {
        const groups = await this.prisma.group.findMany({
            where: { students: { some: { id: userId } } },
            include: {
                theme_access: {
                    include: { theme: { select: { id: true, title: true, order_index: true } } },
                },
            },
        });
        return groups.flatMap(g => g.theme_access.map(ta => ({
            group_id: g.id,
            group_title: g.title,
            theme_id: ta.theme_id,
            theme_title: ta.theme?.title,
            theme_order: ta.theme?.order_index,
            unlock_date: ta.unlock_date,
            deadline: ta.deadline,
            is_visible: ta.is_visible,
        })));
    }
    async getThemeAccess(groupId) {
        return this.prisma.groupThemeAccess.findMany({
            where: { group_id: groupId },
            include: { theme: { select: { id: true, title: true, order_index: true } } },
            orderBy: { theme: { order_index: 'asc' } },
        });
    }
    async upsertThemeAccess(groupId, themeId, data) {
        const unlockDate = data.unlock_date ? new Date(data.unlock_date) : null;
        const deadline = data.deadline ? new Date(data.deadline) : null;
        const record = await this.prisma.groupThemeAccess.upsert({
            where: { group_id_theme_id: { group_id: groupId, theme_id: themeId } },
            create: {
                group_id: groupId,
                theme_id: themeId,
                unlock_date: unlockDate,
                deadline,
                is_visible: data.is_visible ?? true,
            },
            update: {
                unlock_date: unlockDate,
                deadline,
                ...(data.is_visible !== undefined ? { is_visible: data.is_visible } : {}),
            },
            include: { theme: true, group: true },
        });
        if (deadline) {
            const title = `Дедлайн: ${record.theme.title} (${record.group.title})`;
            const existing = await this.prisma.event.findFirst({
                where: {
                    group_id: groupId,
                    type: 'DEADLINE',
                    title,
                },
            });
            if (existing) {
                await this.prisma.event.update({
                    where: { id: existing.id },
                    data: { date: deadline, title },
                });
            }
            else {
                await this.prisma.event.create({
                    data: {
                        title,
                        date: deadline,
                        type: 'DEADLINE',
                        group_id: groupId,
                        description: `Срок сдачи заданий модуля «${record.theme.title}»`,
                    },
                });
            }
        }
        if (unlockDate) {
            const unlockTitle = `Открытие модуля: ${record.theme.title} (${record.group.title})`;
            const existingUnlock = await this.prisma.event.findFirst({
                where: { group_id: groupId, type: 'WEBINAR', title: unlockTitle },
            });
            if (!existingUnlock) {
                await this.prisma.event.create({
                    data: {
                        title: unlockTitle,
                        date: unlockDate,
                        type: 'WEBINAR',
                        group_id: groupId,
                        description: `Открытие модуля «${record.theme.title}» для группы`,
                    },
                });
            }
            else {
                await this.prisma.event.update({
                    where: { id: existingUnlock.id },
                    data: { date: unlockDate },
                });
            }
        }
        return record;
    }
    async findShopGroups() {
        return this.prisma.group.findMany({
            where: { is_public: true },
            include: {
                curator: { select: { name: true, surname: true, avatar: true } },
                courses: { select: { id: true, title: true, cover_url: true, description: true } },
                _count: { select: { students: true } },
            },
        });
    }
    async applyForGroup(groupId, userId, data) {
        const group = await this.prisma.group.findFirst({
            where: { id: groupId, students: { some: { id: userId } } },
        });
        if (group)
            throw new Error('Вы уже являетесь участником этой группы');
        return this.prisma.groupApplication.upsert({
            where: { group_id_user_id: { group_id: groupId, user_id: userId } },
            create: { group_id: groupId, user_id: userId, comment: data.comment, proof_image: data.proof_image },
            update: { comment: data.comment, proof_image: data.proof_image, status: 'PENDING', reviewed_at: null },
        });
    }
    async ensureCanReviewGroupApplications(groupId, reviewerId, reviewerRole) {
        if (reviewerRole === 'ADMIN')
            return;
        const group = await this.prisma.group.findFirst({
            where: { id: groupId, curator_id: reviewerId },
            select: { id: true },
        });
        if (!group)
            throw new common_1.ForbiddenException('Можно смотреть заявки только своей группы');
    }
    async getApplications(groupId, reviewerId, reviewerRole) {
        await this.ensureCanReviewGroupApplications(groupId, reviewerId, reviewerRole);
        return this.prisma.groupApplication.findMany({
            where: { group_id: groupId },
            include: {
                user: { select: { id: true, name: true, surname: true, email: true, avatar: true } },
                group: { select: { id: true, title: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async getMyApplications(userId) {
        return this.prisma.groupApplication.findMany({
            where: { user_id: userId },
            select: { group_id: true, status: true },
        });
    }
    async approveApplication(appId, reviewerId, reviewerRole) {
        const existing = await this.prisma.groupApplication.findUnique({ where: { id: appId } });
        if (!existing)
            throw new common_1.NotFoundException('Заявка не найдена');
        await this.ensureCanReviewGroupApplications(existing.group_id, reviewerId, reviewerRole);
        const app = await this.prisma.groupApplication.update({
            where: { id: appId },
            data: { status: 'APPROVED', reviewed_by: reviewerId, reviewed_at: new Date() },
        });
        await this.enrollStudent(app.group_id, app.user_id);
        return app;
    }
    async rejectApplication(appId, reviewerId, reviewerRole) {
        const existing = await this.prisma.groupApplication.findUnique({ where: { id: appId } });
        if (!existing)
            throw new common_1.NotFoundException('Заявка не найдена');
        await this.ensureCanReviewGroupApplications(existing.group_id, reviewerId, reviewerRole);
        return this.prisma.groupApplication.update({
            where: { id: appId },
            data: { status: 'REJECTED', reviewed_by: reviewerId, reviewed_at: new Date() },
        });
    }
    async enrollStudent(groupId, studentId, requesterId, requesterRole) {
        await this.ensureCanManageGroupMembers(groupId, requesterId, requesterRole);
        const group = await this.prisma.group.update({
            where: { id: groupId },
            data: {
                students: { connect: { id: studentId } }
            },
            include: { courses: true }
        });
        if (group.courses.length > 0) {
            await this.prisma.enrollment.createMany({
                data: group.courses.map((course) => ({ user_id: studentId, course_id: course.id })),
                skipDuplicates: true,
            });
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