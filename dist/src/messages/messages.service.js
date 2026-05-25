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
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MessagesService = class MessagesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getContacts(userId, role) {
        let users;
        if (role === 'STUDENT') {
            users = await this.prisma.user.findMany({
                where: { role: { in: ['CURATOR', 'ADMIN'] } },
                select: { id: true, name: true, surname: true, email: true, role: true, avatar: true }
            });
        }
        else {
            users = await this.prisma.user.findMany({
                where: { role: 'STUDENT' },
                select: { id: true, name: true, surname: true, email: true, role: true, avatar: true }
            });
        }
        const contactsWithUnread = await Promise.all(users.map(async (user) => {
            const unreadCount = await this.prisma.message.count({
                where: {
                    sender_id: user.id,
                    receiver_id: userId,
                    is_read: false
                }
            });
            return { ...user, unreadCount };
        }));
        return contactsWithUnread.sort((a, b) => b.unreadCount - a.unreadCount);
    }
    async getHistory(userId1, userId2) {
        await this.prisma.message.updateMany({
            where: {
                sender_id: userId2,
                receiver_id: userId1,
                is_read: false
            },
            data: { is_read: true }
        });
        return this.prisma.message.findMany({
            where: {
                OR: [
                    { sender_id: userId1, receiver_id: userId2 },
                    { sender_id: userId2, receiver_id: userId1 }
                ]
            },
            orderBy: { created_at: 'asc' }
        });
    }
    async sendMessage(senderId, receiverId, text) {
        return this.prisma.message.create({
            data: {
                sender_id: senderId,
                receiver_id: receiverId,
                text
            }
        });
    }
    async getUnreadCount(userId) {
        const count = await this.prisma.message.count({
            where: {
                receiver_id: userId,
                is_read: false
            }
        });
        return { count };
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map