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
const userListSelect = {
    id: true,
    email: true,
    role: true,
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
    async findAll() {
        return this.prisma.user.findMany({
            select: userListSelect,
            orderBy: { created_at: 'desc' },
        });
    }
    async findAllStudents() {
        return this.prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: { id: true, name: true, surname: true, email: true, avatar: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async findAllCurators() {
        return this.prisma.user.findMany({
            where: { role: 'CURATOR' },
            select: { id: true, name: true, surname: true, email: true, avatar: true },
            orderBy: { created_at: 'desc' },
        });
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