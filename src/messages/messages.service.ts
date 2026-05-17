import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Получаем список контактов (Ученики видят кураторов, Кураторы видят учеников)
  async getContacts(userId: string, role: string) {
    if (role === 'STUDENT') {
      return this.prisma.user.findMany({
        where: { role: { in: ['CURATOR', 'ADMIN'] } },
        select: { id: true, name: true, surname: true, role: true, avatar: true }
      });
    } else {
      return this.prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true, name: true, surname: true, role: true, avatar: true }
      });
    }
  }

  // Получаем историю переписки между двумя людьми
  async getHistory(userId1: string, userId2: string) {
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

  // Отправляем сообщение
  async sendMessage(senderId: string, receiverId: string, text: string) {
    return this.prisma.message.create({
      data: {
        sender_id: senderId,
        receiver_id: receiverId,
        text
      }
    });
  }
}