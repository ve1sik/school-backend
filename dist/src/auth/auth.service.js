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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
let AuthService = class AuthService {
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async issueTokens(userId, email, role) {
        const payload = { sub: userId, email, role };
        const access_token = this.jwt.sign(payload, { expiresIn: '1d' });
        const refresh_token = this.jwt.sign(payload, { expiresIn: '7d' });
        return { access_token, refresh_token };
    }
    async register(dto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('Пользователь с таким email уже существует.');
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(dto.password, salt);
        await this.prisma.user.create({
            data: {
                email: dto.email,
                password_hash: hash,
            },
        });
        return this.login(dto);
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user)
            throw new common_1.UnauthorizedException('Неверный email или пароль');
        const isMatch = await bcrypt.compare(dto.password, user.password_hash);
        if (!isMatch)
            throw new common_1.UnauthorizedException('Неверный email или пароль');
        const tokens = await this.issueTokens(user.id, user.email, user.role);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refresh_token: tokens.refresh_token },
        });
        return {
            user: { id: user.id, email: user.email, role: user.role },
            ...tokens,
        };
    }
    async getMe(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user)
            throw new common_1.UnauthorizedException();
        const { password_hash, refresh_token, ...result } = user;
        return result;
    }
    async updateProfile(userId, dto) {
        const dataToUpdate = {};
        if (dto.email)
            dataToUpdate.email = dto.email;
        if (dto.name)
            dataToUpdate.name = dto.name;
        if (dto.surname)
            dataToUpdate.surname = dto.surname;
        if (dto.patronymic)
            dataToUpdate.patronymic = dto.patronymic;
        if (dto.birthday)
            dataToUpdate.birthday = dto.birthday;
        if (dto.city)
            dataToUpdate.city = dto.city;
        if (dto.avatar)
            dataToUpdate.avatar = dto.avatar;
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
        });
        const { password_hash, refresh_token, ...result } = updatedUser;
        return { message: 'Профиль обновлен', user: result };
    }
    async generateInviteCode(userId) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await this.prisma.user.update({
            where: { id: userId },
            data: { invite_code: code },
        });
        return { code };
    }
    async registerParent(dto) {
        const student = await this.prisma.user.findUnique({
            where: { invite_code: dto.invite_code }
        });
        if (!student) {
            throw new common_1.BadRequestException('Неверный код доступа ребенка. Проверьте код.');
        }
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existingUser)
            throw new common_1.BadRequestException('Пользователь с таким email уже существует');
        const hash = await bcrypt.hash(dto.password, 10);
        const parent = await this.prisma.user.create({
            data: {
                email: dto.email,
                password_hash: hash,
                role: 'PARENT',
                name: dto.name,
                surname: dto.surname,
            }
        });
        await this.prisma.user.update({
            where: { id: student.id },
            data: {
                parent_id: parent.id,
                invite_code: null
            }
        });
        return this.login({ email: dto.email, password: dto.password });
    }
    async linkToStudent(parentId, inviteCode) {
        const student = await this.prisma.user.findUnique({
            where: { invite_code: inviteCode }
        });
        if (!student)
            throw new common_1.BadRequestException('Код не найден');
        await this.prisma.user.update({
            where: { id: student.id },
            data: { parent_id: parentId, invite_code: null }
        });
        return { message: 'Связь установлена!' };
    }
    async getChildren(parentId) {
        return this.prisma.user.findMany({
            where: { parent_id: parentId },
            select: {
                id: true,
                name: true,
                surname: true,
                avatar: true,
                test_attempts: {
                    take: 5,
                    orderBy: { created_at: 'desc' },
                    include: { test: true }
                }
            }
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map