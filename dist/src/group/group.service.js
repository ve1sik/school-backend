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
                curator: { select: { id: true, name: true, surname: true, email: true } },
                _count: { select: { students: true, courses: true } },
            },
            orderBy: { created_at: 'desc' }
        });
    }
    async findOne(id) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            include: {
                curator: { select: { id: true, name: true, surname: true, email: true, avatar: true } },
                students: { select: { id: true, name: true, surname: true, email: true, avatar: true } },
                courses: { select: { id: true, title: true, cover_url: true } },
            },
        });
        if (!group)
            throw new common_1.NotFoundException('Группа не найдена');
        return group;
    }
    async update(id, data) {
        return this.prisma.group.update({
            where: { id },
            data,
        });
    }
    async setStudents(id, studentIds) {
        return this.prisma.group.update({
            where: { id },
            data: {
                students: {
                    set: studentIds.map(studentId => ({ id: studentId }))
                }
            }
        });
    }
    async setCourses(id, courseIds) {
        return this.prisma.group.update({
            where: { id },
            data: {
                courses: {
                    set: courseIds.map(courseId => ({ id: courseId }))
                }
            }
        });
    }
    async remove(id) {
        return this.prisma.group.delete({ where: { id } });
    }
};
exports.GroupService = GroupService;
exports.GroupService = GroupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupService);
//# sourceMappingURL=group.service.js.map