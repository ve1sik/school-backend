import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  private async getContactUserIds(userId: string, role: string): Promise<string[] | null> {
    if (role === 'STUDENT') {
      const groups = await this.prisma.group.findMany({
        where: { students: { some: { id: userId } }, group_kind: 'STUDY' },
        select: { curator_id: true, teacher_id: true },
      });
      const staffIds = new Set<string>();
      for (const group of groups) {
        if (group.curator_id) staffIds.add(group.curator_id);
        if (group.teacher_id) staffIds.add(group.teacher_id);
      }
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      admins.forEach((a) => staffIds.add(a.id));
      return [...staffIds];
    }

    if (role === 'CURATOR') {
      const groups = await this.prisma.group.findMany({
        where: { curator_id: userId, group_kind: 'STUDY' },
        select: { students: { select: { id: true } } },
      });
      return [...new Set(groups.flatMap((g) => g.students.map((s) => s.id)))];
    }

    if (role === 'TEACHER') {
      const groups = await this.prisma.group.findMany({
        where: { teacher_id: userId, group_kind: 'STUDY' },
        select: { students: { select: { id: true } } },
      });
      return [...new Set(groups.flatMap((g) => g.students.map((s) => s.id)))];
    }

    return null;
  }

  // Контакты + счётчик непрочитанных. Без N+1: один groupBy вместо count на каждого.
  async getContacts(userId: string, role: string) {
    const scopedIds = await this.getContactUserIds(userId, role);

    const where =
      scopedIds !== null
        ? { id: { in: scopedIds.length > 0 ? scopedIds : ['__none__'] } }
        : role === 'STUDENT'
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
