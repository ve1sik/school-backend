// Файл: src/course/course.service.ts (Полный код)
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/course.dto';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  // Создать новый курс
  async createCourse(dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        cover_url: dto.cover_url,
      },
    });
  }

  // Получить все курсы
  async getAllCourses() {
    return this.prisma.course.findMany({
      include: { themes: true },
    });
  }

  // Обновить курс по ID
  async updateCourse(id: string, dto: CreateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Курс не найден');

    return this.prisma.course.update({
      where: { id },
      data: dto,
    });
  }

  // Удалить курс
  async deleteCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Курс не найден');

    return this.prisma.course.delete({ where: { id } });
  }
}