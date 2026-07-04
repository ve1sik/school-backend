import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.group.create({ data });
  }

  async findAll(requesterId?: string, requesterRole?: string, requesterPermissions: string[] = []) {
    const where =
      requesterRole === 'CURATOR' && requesterId
        ? { curator_id: requesterId }
        : requesterRole === 'TEACHER' && requesterId
          ? { teacher_id: requesterId }
        : {};

    return this.prisma.group.findMany({
      where,
      include: { 
        _count: { select: { students: true, courses: true } },
        curator: true,
        teacher: true,
      }
    });
  }

  async findOne(id: string, requesterId?: string, requesterRole?: string, requesterPermissions: string[] = []) {
    const where =
      requesterRole === 'CURATOR' && requesterId
        ? { id, curator_id: requesterId }
        : requesterRole === 'TEACHER' && requesterId
          ? { id, teacher_id: requesterId }
        : { id };

    return this.prisma.group.findFirst({
      where,
      include: { courses: true, students: true, curator: true, teacher: true }
    });
  }

  async getCuratorScope(requesterId?: string, requesterRole?: string) {
    const where =
      requesterRole === 'ADMIN'
        ? {}
        : requesterRole === 'TEACHER'
          ? { teacher_id: requesterId }
          : { curator_id: requesterId };

    const courseInclude = {
      themes: {
        orderBy: { order_index: 'asc' as const },
        include: {
          lessons: { orderBy: { order_index: 'asc' as const } },
        },
      },
    };

    const groups = await this.prisma.group.findMany({
      where,
      include: {
        curator: { select: { id: true, name: true, surname: true, email: true } },
        teacher: { select: { id: true, name: true, surname: true, email: true } },
        students: {
          select: { id: true, name: true, surname: true, email: true, avatar: true },
          orderBy: [{ surname: 'asc' }, { name: 'asc' }],
        },
        courses: {
          include: courseInclude,
          orderBy: { title: 'asc' },
        },
      },
      orderBy: { title: 'asc' },
    });

    const studentIds = [...new Set(groups.flatMap((g) => g.students.map((s) => s.id)))];
    if (studentIds.length === 0) return groups;

    const enrollments = await this.prisma.enrollment.findMany({
      where: { user_id: { in: studentIds } },
      select: { user_id: true, course_id: true },
    });
    if (enrollments.length === 0) return groups;

    const studentGroupIds = new Map<string, string[]>();
    for (const group of groups) {
      for (const student of group.students) {
        const existing = studentGroupIds.get(student.id) || [];
        existing.push(group.id);
        studentGroupIds.set(student.id, existing);
      }
    }

    const missingByGroup = new Map<string, Set<string>>();
    for (const enrollment of enrollments) {
      for (const groupId of studentGroupIds.get(enrollment.user_id) || []) {
        const group = groups.find((g) => g.id === groupId);
        if (!group) continue;
        const alreadyLinked = group.courses.some((course) => course.id === enrollment.course_id);
        if (alreadyLinked) continue;
        if (!missingByGroup.has(groupId)) missingByGroup.set(groupId, new Set());
        missingByGroup.get(groupId)!.add(enrollment.course_id);
      }
    }

    const allMissingIds = [
      ...new Set([...missingByGroup.values()].flatMap((ids) => [...ids])),
    ];
    if (allMissingIds.length === 0) return groups;

    const extraCourses = await this.prisma.course.findMany({
      where: { id: { in: allMissingIds } },
      include: courseInclude,
      orderBy: { title: 'asc' },
    });
    const courseById = new Map(extraCourses.map((course) => [course.id, course]));

    for (const group of groups) {
      const missingIds = missingByGroup.get(group.id);
      if (!missingIds?.size) continue;

      const merged = [...group.courses];
      for (const courseId of missingIds) {
        const course = courseById.get(courseId);
        if (course) merged.push(course);
      }
      group.courses = merged.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

      await this.prisma.group.update({
        where: { id: group.id },
        data: {
          courses: {
            connect: [...missingIds].map((id) => ({ id })),
          },
        },
      });
    }

    return groups;
  }

  async update(id: string, data: any, requesterId?: string, requesterRole?: string, requesterPermissions: string[] = []) {
    const { curator_id, curatorId, teacherId, ...rest } = data;
    const updateData: any = { ...rest };

    if (requesterRole === 'CURATOR' && !requesterPermissions.includes('MANAGE_GROUPS')) {
      const group = await this.prisma.group.findUnique({ where: { id }, select: { curator_id: true } });
      if (!group || group.curator_id !== requesterId) {
        throw new ForbiddenException('Можно менять только свою группу');
      }

      // Куратор может назначить/снять преподавателя своей группы, но не менять всё как админ.
      Object.keys(updateData).forEach((key) => delete updateData[key]);
    }

    const effectiveCuratorId = curatorId ?? curator_id;
    if (requesterRole !== 'CURATOR' && effectiveCuratorId !== undefined) {
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
  async updateStudents(groupId: string, studentIds: string[], requesterId?: string, requesterRole?: string) {
    return this.updateStudentsScoped(groupId, studentIds, requesterId, requesterRole);
  }

  private async ensureCanManageGroupMembers(groupId: string, requesterId?: string, requesterRole?: string) {
    if (!requesterId || requesterRole !== 'CURATOR') return;
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, curator_id: requesterId },
      select: { id: true },
    });
    if (!group) throw new ForbiddenException('Можно менять участников только своей группы');
  }

  async updateStudentsScoped(groupId: string, studentIds: string[], requesterId?: string, requesterRole?: string) {
    await this.ensureCanManageGroupMembers(groupId, requesterId, requesterRole);

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

  async removeStudent(groupId: string, userId: string, requesterId?: string, requesterRole?: string) {
    await this.ensureCanManageGroupMembers(groupId, requesterId, requesterRole);

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
      where: { is_public: true },
      include: {
        curator: { select: { name: true, surname: true, avatar: true } },
        courses: { select: { id: true, title: true, cover_url: true, description: true } },
        _count: { select: { students: true } },
      },
    });
  }

  async applyForGroup(groupId: string, userId: string, data: { comment?: string; proof_image?: string }) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, students: { some: { id: userId } } },
    });
    if (group) throw new Error('Вы уже являетесь участником этой группы');

    return this.prisma.groupApplication.upsert({
      where: { group_id_user_id: { group_id: groupId, user_id: userId } },
      create: { group_id: groupId, user_id: userId, comment: data.comment, proof_image: data.proof_image },
      update: { comment: data.comment, proof_image: data.proof_image, status: 'PENDING', reviewed_at: null },
    });
  }

  private async ensureCanReviewGroupApplications(
    groupId: string,
    reviewerId?: string,
    reviewerRole?: string,
    permissions: string[] = [],
  ) {
    if (reviewerRole === 'ADMIN' || permissions.includes('MANAGE_USERS')) return;
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        OR: [
          { curator_id: reviewerId },
          ...(reviewerRole === 'TEACHER' ? [{ teacher_id: reviewerId }] : []),
        ],
      },
      select: { id: true },
    });
    if (!group) throw new ForbiddenException('Можно смотреть заявки только своей группы');
  }

  async getApplications(groupId: string, reviewerId?: string, reviewerRole?: string, permissions: string[] = []) {
    await this.ensureCanReviewGroupApplications(groupId, reviewerId, reviewerRole, permissions);

    return this.prisma.groupApplication.findMany({
      where: { group_id: groupId },
      include: {
        user: { select: { id: true, name: true, surname: true, email: true, avatar: true } },
        group: { select: { id: true, title: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getMyApplications(userId: string) {
    return this.prisma.groupApplication.findMany({
      where: { user_id: userId },
      select: { group_id: true, status: true },
    });
  }

  async getPendingApplications(reviewerId?: string, reviewerRole?: string, permissions: string[] = []) {
    const canSeeAll =
      reviewerRole === 'ADMIN' ||
      permissions.includes('MANAGE_USERS') ||
      permissions.includes('MANAGE_GROUPS');

    if (!canSeeAll) {
      throw new ForbiddenException('Нет доступа к заявкам');
    }

    const where: any = { status: 'PENDING' as const };

    if (
      reviewerRole !== 'ADMIN' &&
      !permissions.includes('MANAGE_USERS') &&
      permissions.includes('MANAGE_GROUPS')
    ) {
      where.group = { curator_id: reviewerId };
    }

    const apps = await this.prisma.groupApplication.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, surname: true, email: true, avatar: true } },
        group: { select: { id: true, title: true, price: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      count: apps.length,
      applications: apps.map((app) => ({
        id: app.id,
        status: app.status,
        comment: app.comment,
        proof_image: app.proof_image,
        created_at: app.created_at,
        user: app.user,
        group: app.group,
      })),
    };
  }

  async approveApplication(appId: string, reviewerId: string, reviewerRole?: string, permissions: string[] = []) {
    const existing = await this.prisma.groupApplication.findUnique({ where: { id: appId } });
    if (!existing) throw new NotFoundException('Заявка не найдена');
    await this.ensureCanReviewGroupApplications(existing.group_id, reviewerId, reviewerRole, permissions);

    const app = await this.prisma.groupApplication.update({
      where: { id: appId },
      data: { status: 'APPROVED', reviewed_by: reviewerId, reviewed_at: new Date() },
    });
    await this.enrollStudent(app.group_id, app.user_id);
    return app;
  }

  async rejectApplication(appId: string, reviewerId: string, reviewerRole?: string, permissions: string[] = []) {
    const existing = await this.prisma.groupApplication.findUnique({ where: { id: appId } });
    if (!existing) throw new NotFoundException('Заявка не найдена');
    await this.ensureCanReviewGroupApplications(existing.group_id, reviewerId, reviewerRole, permissions);

    return this.prisma.groupApplication.update({
      where: { id: appId },
      data: { status: 'REJECTED', reviewed_by: reviewerId, reviewed_at: new Date() },
    });
  }

  async enrollStudent(groupId: string, studentId: string, requesterId?: string, requesterRole?: string) {
    await this.ensureCanManageGroupMembers(groupId, requesterId, requesterRole);

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

