import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Контакты + счётчик непрочитанных. Без N+1: один groupBy вместо count на каждого.
  async getContacts(userId: string, role: string) {
    const where =
      role === 'STUDENT'
        ? { role: { in: ['CURATOR', 'TEACHER', 'ADMIN'] as any } }
        : { role: 'STUDENT' as any };

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, name: true, surname: true, email: true, role: true, avatar: true },
    });

    // Одним запросом группируем непрочитанные входящие по отправителю
    const grouped = await this.prisma.message.groupBy({
      by: ['sender_id'],
      where: { receiver_id: userId, is_read: false },
      _count: { _all: true },
    });
    const unreadMap = new Map(grouped.map((g) => [g.sender_id, g._count._all]));

    return users
      .map((user) => ({ ...user, unreadCount: unreadMap.get(user.id) || 0 }))
      .sort((a, b) => b.unreadCount - a.unreadCount);
  }

  async getHistory(userId1: string, userId2: string) {
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

  async sendMessage(senderId: string, receiverId: string, text: string) {
    return this.prisma.message.create({
      data: {
        sender_id: senderId,
        receiver_id: receiverId,
        text
      }
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        receiver_id: userId,
        is_read: false
      }
    });
    return { count };
  }
}