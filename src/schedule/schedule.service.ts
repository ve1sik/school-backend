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
        date: new Date(data.date), // Принимаем дату с фронта
        type: data.type || 'WEBINAR',
        link: data.link,
      }
    });
  }

  async deleteEvent(id: string) {
    return this.prisma.event.delete({
      where: { id }
    });
  }
}