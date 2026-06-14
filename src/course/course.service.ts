import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        themes: {
          orderBy: { order_index: 'asc' },
          include: {
            lessons: {
              orderBy: { order_index: 'asc' }, 
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Курс не найден');
    return course;
  }

  async getAllCourses(userId?: string, userRole?: string) {
    if (userRole === 'ADMIN') {
      return this.prisma.course.findMany({
        include: {
          themes: {
            orderBy: { order_index: 'asc' },
            include: {
              lessons: { orderBy: { order_index: 'asc' } },
            },
          },
        },
        orderBy: { title: 'asc' }, 
      });
    }

    // Куратор видит только курсы своих кураторских групп, преподаватель — своих преподавательских групп.
    if (userRole === 'CURATOR' && userId) {
      return this.prisma.course.findMany({
        where: {
          groups: {
            some: {
              curator_id: userId,
            },
          },
        },
        include: {
          themes: {
            orderBy: { order_index: 'asc' },
            include: {
              lessons: { orderBy: { order_index: 'asc' } },
            },
          },
        },
        orderBy: { title: 'asc' },
      });
    }

    if (userRole === 'TEACHER' && userId) {
      return this.prisma.course.findMany({
        where: {
          groups: {
            some: {
              teacher_id: userId,
            },
          },
        },
        include: {
          themes: {
            orderBy: { order_index: 'asc' },
            include: {
              lessons: { orderBy: { order_index: 'asc' } },
            },
          },
        },
        orderBy: { title: 'asc' },
      });
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { user_id: userId },
      select: { course_id: true }
    });

    const purchasedCourseIds = enrollments.map(e => e.course_id);

    if (purchasedCourseIds.length === 0) {
      return [];
    }

    return this.prisma.course.findMany({
      where: {
        id: { in: purchasedCourseIds } // Фильтр IN
      },
      include: {
        themes: {
          orderBy: { order_index: 'asc' },
          include: {
            lessons: { orderBy: { order_index: 'asc' } },
          },
        },
      },
      orderBy: { title: 'asc' }, 
    });
  }

  async create(dto: any) {
    return this.prisma.course.create({ data: dto });
  }

  private async ensureCanManageCourse(id: string, userId?: string, userRole?: string) {
    if (userRole === 'ADMIN') return;
    if (!userId || !['CURATOR', 'TEACHER'].includes(userRole || '')) {
      throw new ForbiddenException('Нет доступа к курсу');
    }

    const groupRoleFilter = userRole === 'CURATOR' ? { curator_id: userId } : { teacher_id: userId };
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        groups: {
          some: groupRoleFilter,
        },
      },
      select: { id: true },
    });

    if (!course) throw new ForbiddenException('Можно менять только назначенный курс');
  }

  async updateCourse(id: string, dto: any, userId?: string, userRole?: string) {
    await this.ensureCanManageCourse(id, userId, userRole);
    // Берём только поля, которые реально есть в модели Course
    const allowed = ['title', 'description', 'cover_url', 'spell_check', 'subject_id'];
    const data: any = {};
    for (const key of allowed) {
      if (key in dto) data[key] = dto[key];
    }
    return this.prisma.course.update({ where: { id }, data });
  }

  async delete(id: string) {
    const themes = await this.prisma.theme.findMany({ where: { course_id: id } });
    const themeIds = themes.map(t => t.id);

    if (themeIds.length > 0) {
      await this.prisma.lesson.deleteMany({
        where: { theme_id: { in: themeIds } }
      });
    }

    await this.prisma.theme.deleteMany({
      where: { course_id: id }
    });

    return this.prisma.course.delete({ where: { id } });
  }
}