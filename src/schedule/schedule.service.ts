import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

type CreateEventInput = {
  title: string;
  description?: string;
  date: string | Date;
  type?: string;
  custom_type?: string;
  link?: string;
  group_id?: string;
};

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  private buildEventData(data: CreateEventInput) {
    return {
      title: data.title,
      description: data.description,
      date: new Date(data.date),
      type: (data.type || 'WEBINAR') as any,
      custom_type: data.custom_type?.trim() || null,
      link: data.link,
      ...(data.group_id ? { group: { connect: { id: data.group_id } } } : {}),
    };
  }

  async getEventsForUser(userId: string, role: string) {
    const where: any = {};

    if (role === Role.STUDENT) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          groups: { select: { id: true } },
          enrollments: { select: { course_id: true } },
        },
      });
      const groupIds = user?.groups.map((g) => g.id) ?? [];
      const courseIds = user?.enrollments.map((e) => e.course_id) ?? [];

      let relatedGroupIds = [...groupIds];
      if (courseIds.length > 0) {
        const courseGroups = await this.prisma.group.findMany({
          where: { courses: { some: { id: { in: courseIds } } } },
          select: { id: true },
        });
        relatedGroupIds = [...new Set([...relatedGroupIds, ...courseGroups.map((g) => g.id)])];
      }

      where.OR = [
        { group_id: null },
        ...(relatedGroupIds.length > 0 ? [{ group_id: { in: relatedGroupIds } }] : []),
      ];
    } else if (role === Role.CURATOR) {
      const groups = await this.prisma.group.findMany({
        where: { curator_id: userId },
        select: { id: true },
      });
      const groupIds = groups.map((g) => g.id);
      where.OR = [{ group_id: null }, ...(groupIds.length > 0 ? [{ group_id: { in: groupIds } }] : [])];
    } else if (role === Role.TEACHER) {
      const groups = await this.prisma.group.findMany({
        where: { teacher_id: userId },
        select: { id: true },
      });
      const groupIds = groups.map((g) => g.id);
      where.OR = [{ group_id: null }, ...(groupIds.length > 0 ? [{ group_id: { in: groupIds } }] : [])];
    }

    return this.prisma.event.findMany({
      where,
      include: {
        group: { select: { id: true, title: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async createEvent(data: CreateEventInput) {
    return this.prisma.event.create({
      data: this.buildEventData(data),
      include: { group: { select: { id: true, title: true } } },
    });
  }

  async createBulkEvents(data: CreateEventInput & { dates?: string[]; repeat_weeks?: number }) {
    const dates: Date[] = [];
    const baseDate = new Date(data.date);

    if (Array.isArray(data.dates) && data.dates.length > 0) {
      for (const d of data.dates) {
        const parsed = new Date(d);
        if (!Number.isNaN(parsed.getTime())) dates.push(parsed);
      }
    } else if (data.repeat_weeks && data.repeat_weeks > 1) {
      for (let i = 0; i < data.repeat_weeks; i++) {
        const next = new Date(baseDate);
        next.setDate(next.getDate() + i * 7);
        dates.push(next);
      }
    } else {
      dates.push(baseDate);
    }

    const created = await this.prisma.$transaction(
      dates.map((date) =>
        this.prisma.event.create({
          data: this.buildEventData({ ...data, date }),
        }),
      ),
    );

    return { count: created.length, events: created };
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
      where: { id },
    });
  }

  async getAssignableGroups(userId: string, role: string) {
    if (role === Role.ADMIN) {
      return this.prisma.group.findMany({
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      });
    }
    if (role === Role.CURATOR) {
      return this.prisma.group.findMany({
        where: { curator_id: userId },
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      });
    }
    if (role === Role.TEACHER) {
      return this.prisma.group.findMany({
        where: { teacher_id: userId },
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      });
    }
    return [];
  }
}
