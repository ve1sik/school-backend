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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcrypt");
const userListSelect = {
    id: true,
    email: true,
    role: true,
    admin_permissions: true,
    name: true,
    surname: true,
    patronymic: true,
    birthday: true,
    city: true,
    avatar: true,
    created_at: true,
    enrollments: {
        include: {
            course: { select: { id: true, title: true } },
        },
    },
    groups: { select: { id: true, title: true } },
    subjects: { select: { id: true, title: true } },
};
let UserService = class UserService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(skip, take, requesterId, requesterRole, requesterPermissions = []) {
        if (requesterRole === 'CURATOR' && requesterId) {
            const groups = await this.prisma.group.findMany({
                where: { curator_id: requesterId },
                select: {
                    curator_id: true,
                    teacher_id: true,
                    students: { select: { id: true } },
                },
            });
            const scopedIds = new Set([requesterId]);
            groups.forEach((group) => {
                if (group.curator_id)
                    scopedIds.add(group.curator_id);
                if (group.teacher_id)
                    scopedIds.add(group.teacher_id);
                group.students.forEach((student) => scopedIds.add(student.id));
            });
            if (scopedIds.size === 0)
                return [];
            return this.prisma.user.findMany({
                where: { id: { in: [...scopedIds] } },
                select: userListSelect,
                orderBy: { created_at: 'desc' },
            });
        }
        return this.prisma.user.findMany({
            select: userListSelect,
            orderBy: { created_at: 'desc' },
            ...(skip !== undefined && !Number.isNaN(skip) ? { skip } : {}),
            ...(take !== undefined && !Number.isNaN(take) ? { take } : {}),
        });
    }
    async findAllStudents(requesterId, requesterRole, requesterPermissions = []) {
        if (requesterRole === 'CURATOR' && requesterId) {
            const groups = await this.prisma.group.findMany({
                where: { curator_id: requesterId },
                select: { students: { select: { id: true } } },
            });
            const studentIds = [...new Set(groups.flatMap((g) => g.students.map((s) => s.id)))];
            if (studentIds.length === 0)
                return [];
            return this.prisma.user.findMany({
                where: { id: { in: studentIds }, role: 'STUDENT' },
                select: { id: true, name: true, surname: true, email: true, avatar: true },
                orderBy: { created_at: 'desc' },
            });
        }
        return this.prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: { id: true, name: true, surname: true, email: true, avatar: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async findAllCurators(requesterId, requesterRole, requesterPermissions = []) {
        if (requesterRole === 'CURATOR' && requesterId) {
            return this.prisma.user.findMany({
                where: { id: requesterId },
                select: { id: true, name: true, surname: true, email: true, avatar: true },
            });
        }
        return this.prisma.user.findMany({
            where: { role: 'CURATOR' },
            select: { id: true, name: true, surname: true, email: true, avatar: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async findAllTeachers() {
        return this.prisma.user.findMany({
            where: { role: 'TEACHER' },
            select: { id: true, name: true, surname: true, email: true, avatar: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async createUser(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing)
            throw new common_1.BadRequestException('Пользователь с таким email уже существует');
        const hash = await bcrypt.hash(dto.password, 10);
        return this.prisma.user.create({
            data: {
                email: dto.email,
                password_hash: hash,
                name: dto.name,
                surname: dto.surname,
                role: dto.role || 'STUDENT',
            },
            select: userListSelect,
        });
    }
    async updateUser(id, dto, requesterRole) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        const data = {};
        if (dto.role)
            data.role = dto.role;
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.surname !== undefined)
            data.surname = dto.surname;
        if (dto.email)
            data.email = dto.email;
        if (dto.password)
            data.password_hash = await bcrypt.hash(dto.password, 10);
        if (dto.admin_permissions !== undefined) {
            if (requesterRole !== 'ADMIN') {
                throw new common_1.BadRequestException('Только администратор может менять доступы к админкам');
            }
            data.admin_permissions = Array.isArray(dto.admin_permissions) ? dto.admin_permissions : [];
        }
        return this.prisma.user.update({ where: { id }, data, select: userListSelect });
    }
    async updateRole(id, role) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        return this.prisma.user.update({
            where: { id },
            data: { role },
            select: userListSelect,
        });
    }
    async deleteUser(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        await this.prisma.user.delete({ where: { id } });
        return { success: true };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserService);
//# sourceMappingURL=user.service.js.map