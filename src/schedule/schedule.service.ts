import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async getEvents() {
    return this.prisma.event.findMany({
      orderBy: { date: 'asc' }
    });
  }

  async createEvent(data: any) {
    return this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        type: data.type || 'WEBINAR',
        link: data.link,
        ...(data.group_id ? { group: { connect: { id: data.group_id } } } : {}),
      }
    });
  }

  async upsertEvent(data: { title: string; date: Date; type: string; description?: string; group_id?: string }) {
    const existing = await this.prisma.event.findFirst({
      where: { title: data.title, type: data.type as any },
    });
    if (existing) {
      return this.prisma.event.update({
        where: { id: existing.id },
        data: { date: data.date, description: data.description },
      });
    }
    return this.prisma.event.create({
      data: {
        title: data.title,
        date: data.date,
        type: data.type as any,
        description: data.description,
        ...(data.group_id ? { group: { connect: { id: data.group_id } } } : {}),
      },
    });
  }

  async deleteEvent(id: string) {
    return this.prisma.event.delete({
      where: { id }
    });
  }
}