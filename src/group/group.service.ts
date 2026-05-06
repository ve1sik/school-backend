import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  // Создать группу
  async create(data: { title: string }) {
    return this.prisma.group.create({ data });
  }

  // Получить список всех групп (с подсчетом студентов и инфой о кураторе)
  async findAll() {
    return this.prisma.group.findMany({
      include: {
        curator: { select: { id: true, name: true, surname: true, email: true } },
        _count: { select: { students: true, courses: true } },
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // Получить одну группу со всеми деталями
  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        curator: { select: { id: true, name: true, surname: true, email: true, avatar: true } },
        students: { select: { id: true, name: true, surname: true, email: true, avatar: true } },
        courses: { select: { id: true, title: true, cover_url: true } },
      },
    });
    if (!group) throw new NotFoundException('Группа не найдена');
    return group;
  }

  // Обновить название или куратора
  async update(id: string, data: { title?: string; curator_id?: string }) {
    return this.prisma.group.update({
      where: { id },
      data,
    });
  }

  // Привязать студентов (старые отвяжутся, новые привяжутся)
  async setStudents(id: string, studentIds: string[]) {
    return this.prisma.group.update({
      where: { id },
      data: {
        students: {
          set: studentIds.map(studentId => ({ id: studentId }))
        }
      }
    });
  }

  // Привязать курсы (старые отвяжутся, новые привяжутся)
  async setCourses(id: string, courseIds: string[]) {
    return this.prisma.group.update({
      where: { id },
      data: {
        courses: {
          set: courseIds.map(courseId => ({ id: courseId }))
        }
      }
    });
  }

  // Удалить группу
  async remove(id: string) {
    return this.prisma.group.delete({ where: { id } });
  }
}