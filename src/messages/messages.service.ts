import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async getContacts(userId: string, role: string) {
    if (role === 'STUDENT') {
      return this.prisma.user.findMany({
        where: { role: { in: ['CURATOR', 'ADMIN'] } },
        select: { id: true, name: true, surname: true, email: true, role: true, avatar: true } 
      });
    } else {
      return this.prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true, name: true, surname: true, email: true, role: true, avatar: true }
      });
    }
  }

  async getHistory(userId1: string, userId2: string) {
    // 🔥 МАГИЯ: Сначала помечаем все сообщения от собеседника ко мне как прочитанные
    await this.prisma.message.updateMany({
      where: {
        sender_id: userId2,
        receiver_id: userId1,
        is_read: false
      },
      data: {
        is_read: true
      }
    });

    // Затем уже отдаем историю чата
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

  // 🔥 НОВЫЙ МЕТОД: Считаем все непрочитанные сообщения для конкретного юзера
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