import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

const LESSON_LIGHT_SELECT = {
  id: true,
  title: true,
  type: true,
  theme_id: true,
  order_index: true,
  is_visible: true,
  is_homework: true,
  include_in_analytics: true,
  deadline: true,
  unlock_date: true,
  video_url: true,
  created_at: true,
  content: true,
} as const;

const THEMES_WITH_FULL_LESSONS = {
  orderBy: { order_index: 'asc' as const },
  include: {
    lessons: { orderBy: { order_index: 'asc' as const } },
  },
};

const THEMES_WITH_LIGHT_LESSONS = {
  orderBy: { order_index: 'asc' as const },
  include: {
    lessons: {
      orderBy: { order_index: 'asc' as const },
      select: LESSON_LIGHT_SELECT,
    },
  },
};

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  /** Для учеников: метаданные блоков без тяжёлого content (орфография, аналитика). */
  private stripLessonContentForClient(lesson: any) {
    if (!lesson?.content) {
      return { ...lesson, blocksMeta: [] as any[], content: undefined };
    }
    let blocksMeta: any[] = [];
    let homeworkBlocks: any[] = [];
    let hasHomework = false;
    try {
      const parsed = JSON.parse(lesson.content);
      if (Array.isArray(parsed)) {
        homeworkBlocks = parsed.filter((b: any) => b.isHomework);
        hasHomework = homeworkBlocks.length > 0;
        blocksMeta = parsed.map((b: any) => ({
          id: String(b.id),
          type: b.type,
          title: b.title,
          isHomework: !!b.isHomework,
          spellRule: b.spellRule || null,
          pairs: Array.isArray(b.pairs)
            ? b.pairs.map((p: any) => ({
                left: p.left,
                right: p.right,
                spellRule: p.spellRule || null,
              }))
            : undefined,
        }));
      }
    } catch {
      blocksMeta = [];
      homeworkBlocks = [];
    }
    const { content, ...rest } = lesson;
    return { ...rest, blocksMeta, homeworkBlocks, hasHomework };
  }

  private sanitizeCoursesForClient(courses: any[], role?: string) {
    if (role === 'ADMIN' || role === 'CURATOR' || role === 'TEACHER') return courses;
    return courses.map((course) => ({
      ...course,
      themes: course.themes?.map((theme: any) => ({
        ...theme,
        lessons: theme.lessons?.map((lesson: any) => this.stripLessonContentForClient(lesson)),
      })),
    }));
  }

  /** Полный контент уроков нужен только в админке; на телефонах Safari падает от мегабайт JSON. */
  private themesInclude(role?: string) {
    return role === 'ADMIN' || role === 'CURATOR' || role === 'TEACHER'
      ? THEMES_WITH_FULL_LESSONS
      : THEMES_WITH_LIGHT_LESSONS;
  }

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
      const courses = await this.prisma.course.findMany({
        include: { themes: this.themesInclude(userRole) },
        orderBy: { title: 'asc' },
      });
      return this.sanitizeCoursesForClient(courses, userRole);
    }

    // Куратор видит только курсы своих кураторских групп, преподаватель — своих преподавательских групп.
    if (userRole === 'CURATOR' && userId) {
      const courses = await this.prisma.course.findMany({
        where: {
          groups: {
            some: {
              curator_id: userId,
              is_public: false,
            },
          },
        },
        include: { themes: this.themesInclude(userRole) },
        orderBy: { title: 'asc' },
      });
      return this.sanitizeCoursesForClient(courses, userRole);
    }

    if (userRole === 'TEACHER' && userId) {
      const courses = await this.prisma.course.findMany({
        where: {
          groups: {
            some: {
              teacher_id: userId,
            },
          },
        },
        include: { themes: this.themesInclude(userRole) },
        orderBy: { title: 'asc' },
      });
      return this.sanitizeCoursesForClient(courses, userRole);
    }

    // Курсы из учебных групп, но без просроченного доступа по enrollment.expires_at
    const groups = await this.prisma.group.findMany({
      where: { students: { some: { id: userId } }, group_kind: 'STUDY' },
      select: { courses: { select: { id: true } } },
    });

    const courseIdSet = new Set<string>();
    groups.forEach((g) => g.courses.forEach((c) => courseIdSet.add(c.id)));

    if (courseIdSet.size === 0) {
      return [];
    }

    const now = new Date();
    const enrollments = await this.prisma.enrollment.findMany({
      where: { user_id: userId, course_id: { in: [...courseIdSet] } },
      select: { course_id: true, expires_at: true },
    });
    const expiredIds = new Set(
      enrollments
        .filter((e) => e.expires_at && e.expires_at < now)
        .map((e) => e.course_id),
    );
    const activeIds = [...courseIdSet].filter((id) => !expiredIds.has(id));

    if (activeIds.length === 0) {
      return [];
    }

    const courses = await this.prisma.course.findMany({
      where: { id: { in: activeIds } },
      include: { themes: this.themesInclude(userRole) },
      orderBy: { title: 'asc' },
    });
    return this.sanitizeCoursesForClient(courses, userRole);
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
    const allowed = ['title', 'description', 'cover_url', 'spell_check', 'oral_in_analytics', 'subject_id'];
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