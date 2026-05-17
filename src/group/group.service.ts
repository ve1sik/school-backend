import { Injectable } from '@nestjs/common';
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
        _count: {
          select: { students: true, courses: true }
        },
        curator: true 
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: { courses: true, students: true, curator: true }
    });
  }

  async update(id: string, data: any) {
    const { curator_id, ...rest } = data;
    const updateData: any = { ...rest };

    if (curator_id !== undefined) {
      if (curator_id === null || curator_id === '') {
        updateData.curator = { disconnect: true }; 
      } else {
        updateData.curator = { connect: { id: curator_id } }; 
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

    // Если в группе уже есть ученики, выдаем им этот новый курс в Enrollment
    if (group.students.length > 0) {
      for (const student of group.students) {
        for (const courseId of courseIds) {
          const existing = await this.prisma.enrollment.findFirst({
            where: { user_id: student.id, course_id: courseId }
          });
          if (!existing) {
            await this.prisma.enrollment.create({
              data: { user_id: student.id, course_id: courseId }
            });
          }
        }
      }
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

    // Если в группе есть курсы, выдаем их добавленным ученикам в Enrollment
    if (group.courses.length > 0) {
      for (const studentId of studentIds) {
        for (const course of group.courses) {
          const existing = await this.prisma.enrollment.findFirst({
            where: { user_id: studentId, course_id: course.id }
          });
          if (!existing) {
            await this.prisma.enrollment.create({
              data: { user_id: studentId, course_id: course.id }
            });
          }
        }
      }
    }
    return group;
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
}