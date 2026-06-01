import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.group.create({ data });
  }

  async findAll() {
    return this.prisma.group.findMany({
      include: { 
        _count: { select: { students: true, courses: true } },
        curator: true,
        teacher: true,
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: { courses: true, students: true, curator: true, teacher: true }
    });
  }

  async update(id: string, data: any) {
    const { curator_id, curatorId, teacherId, ...rest } = data;
    const updateData: any = { ...rest };

    const effectiveCuratorId = curatorId ?? curator_id;
    if (effectiveCuratorId !== undefined) {
      if (effectiveCuratorId === null || effectiveCuratorId === '') {
        updateData.curator = { disconnect: true };
      } else {
        updateData.curator = { connect: { id: effectiveCuratorId } };
      }
    }

    if (teacherId !== undefined) {
      if (teacherId === null || teacherId === '') {
        updateData.teacher = { disconnect: true };
      } else {
        updateData.teacher = { connect: { id: teacherId } };
      }
    }

    return this.prisma.group.update({ 
      where: { id }, 
      data: updateData 
    });
  }

  async remove(id: string) {
    return this.prisma.group.delete({ where: { id } });
  }

  // 🔥 ИСПРАВЛЕННЫЙ МЕТОД: Обновляем курсы и выдаем доступы УЖЕ добавленным ученикам
  async updateCourses(groupId: string, courseIds: string[]) {
    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        courses: { set: courseIds.map(id => ({ id })) }
      },
      include: { students: true } // Получаем список учеников в группе
    });

    // Выдаём всем ученикам группы доступ к курсам одним запросом (без N+1)
    if (group.students.length > 0 && courseIds.length > 0) {
      const data = group.students.flatMap((student) =>
        courseIds.map((courseId) => ({ user_id: student.id, course_id: courseId })),
      );
      await this.prisma.enrollment.createMany({ data, skipDuplicates: true });
    }
    return group;
  }

  // 🔥 ИСПРАВЛЕННЫЙ МЕТОД: Обновляем учеников и выдаем им курсы ЭТОЙ группы
  async updateStudents(groupId: string, studentIds: string[]) {
    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        students: { set: studentIds.map(id => ({ id })) }
      },
      include: { courses: true } // Получаем список курсов группы
    });

    // Выдаём добавленным ученикам курсы группы одним запросом (без N+1)
    if (group.courses.length > 0 && studentIds.length > 0) {
      const data = studentIds.flatMap((studentId) =>
        group.courses.map((course) => ({ user_id: studentId, course_id: course.id })),
      );
      await this.prisma.enrollment.createMany({ data, skipDuplicates: true });
    }
    return group;
  }

  async removeStudent(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { students: { where: { id: userId } } },
    });
    if (!group) throw new NotFoundException('Группа не найдена');

    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        students: { disconnect: { id: userId } },
      },
    });
  }

  async getMyThemeAccess(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: { students: { some: { id: userId } } },
      include: {
        theme_access: {
          include: { theme: { select: { id: true, title: true, order_index: true } } },
        },
      },
    });
    return groups.flatMap(g =>
      g.theme_access.map(ta => ({
        group_id: g.id,
        group_title: g.title,
        theme_id: ta.theme_id,
        theme_title: ta.theme?.title,
        theme_order: ta.theme?.order_index,
        unlock_date: ta.unlock_date,
        deadline: ta.deadline,
        is_visible: ta.is_visible,
      })),
    );
  }

  async getThemeAccess(groupId: string) {
    return this.prisma.groupThemeAccess.findMany({
      where: { group_id: groupId },
      include: { theme: { select: { id: true, title: true, order_index: true } } },
      orderBy: { theme: { order_index: 'asc' } },
    });
  }

  async upsertThemeAccess(
    groupId: string,
    themeId: string,
    data: { unlock_date?: string | null; deadline?: string | null; is_visible?: boolean },
  ) {
    const unlockDate = data.unlock_date ? new Date(data.unlock_date) : null;
    const deadline = data.deadline ? new Date(data.deadline) : null;

    const record = await this.prisma.groupThemeAccess.upsert({
      where: { group_id_theme_id: { group_id: groupId, theme_id: themeId } },
      create: {
        group_id: groupId,
        theme_id: themeId,
        unlock_date: unlockDate,
        deadline,
        is_visible: data.is_visible ?? true,
      },
      update: {
        unlock_date: unlockDate,
        deadline,
        ...(data.is_visible !== undefined ? { is_visible: data.is_visible } : {}),
      },
      include: { theme: true, group: true },
    });

    // Auto-manage DEADLINE event in schedule
    if (deadline) {
      const title = `Дедлайн: ${record.theme.title} (${record.group.title})`;
      const existing = await this.prisma.event.findFirst({
        where: {
          group_id: groupId,
          type: 'DEADLINE',
          title,
        },
      });
      if (existing) {
        await this.prisma.event.update({
          where: { id: existing.id },
          data: { date: deadline, title },
        });
      } else {
        await this.prisma.event.create({
          data: {
            title,
            date: deadline,
            type: 'DEADLINE',
            group_id: groupId,
            description: `Срок сдачи заданий модуля «${record.theme.title}»`,
          },
        });
      }
    }

    // Auto-manage unlock event when unlock_date set
    if (unlockDate) {
      const unlockTitle = `Открытие модуля: ${record.theme.title} (${record.group.title})`;
      const existingUnlock = await this.prisma.event.findFirst({
        where: { group_id: groupId, type: 'WEBINAR', title: unlockTitle },
      });
      if (!existingUnlock) {
        await this.prisma.event.create({
          data: {
            title: unlockTitle,
            date: unlockDate,
            type: 'WEBINAR',
            group_id: groupId,
            description: `Открытие модуля «${record.theme.title}» для группы`,
          },
        });
      } else {
        await this.prisma.event.update({
          where: { id: existingUnlock.id },
          data: { date: unlockDate },
        });
      }
    }

    return record;
  }

  async findShopGroups() {
    return this.prisma.group.findMany({
      where: { 
        is_public: true,
        price: { gt: 0 }
      },
      include: {
        curator: { select: { name: true, surname: true, avatar: true } }
      }
    });
  }
  // 🔥 ЛОГИКА ЗАЧИСЛЕНИЯ ПОСЛЕ ПОКУПКИ
  async enrollStudent(groupId: string, studentId: string) {
    // 1. Привязываем ученика к группе
    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        students: { connect: { id: studentId } }
      },
      include: { courses: true } // Сразу вытягиваем все курсы этой группы
    });

    // 2. Выдаем ученику доступы (Enrollments) ко всем курсам этой группы одним запросом
    if (group.courses.length > 0) {
      await this.prisma.enrollment.createMany({
        data: group.courses.map((course) => ({ user_id: studentId, course_id: course.id })),
        skipDuplicates: true,
      });
    }

    return { success: true, message: 'Студент успешно добавлен в группу и получил курсы' };
  }
}

