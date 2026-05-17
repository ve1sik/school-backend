import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // 🔥 ОБНОВЛЕНО: Теперь считаем непрочитанные для каждого контакта
  async getContacts(userId: string, role: string) {
    let users;
    if (role === 'STUDENT') {
      users = await this.prisma.user.findMany({
        where: { role: { in: ['CURATOR', 'ADMIN'] } },
        select: { id: true, name: true, surname: true, email: true, role: true, avatar: true } 
      });
    } else {
      users = await this.prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true, name: true, surname: true, email: true, role: true, avatar: true }
      });
    }

    // Считаем сообщения для каждого
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

    // Сортируем: те, у кого есть новые сообщения, будут сверху списка!
    return contactsWithUnread.sort((a, b) => b.unreadCount - a.unreadCount);
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