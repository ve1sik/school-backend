import { Injectable, NotFoundException } from '@nestjs/common';
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

  async getAllCourses() {
    return this.prisma.course.findMany({
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
      orderBy: { title: 'asc' }, 
    });
  }

  async create(dto: any) {
    return this.prisma.course.create({ data: dto });
  }

  async updateCourse(id: string, dto: any) {
    return this.prisma.course.update({
      where: { id },
      data: dto,
    });
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