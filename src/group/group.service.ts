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

  // 🔥 ИСПРАВЛЕННЫЙ МЕТОД СОХРАНЕНИЯ (ПЕРЕВОДЧИК ДЛЯ PRISMA)
  async update(id: string, data: any) {
    const { curator_id, ...rest } = data;
    const updateData: any = { ...rest };

    // Если фронтенд прислал нам куратора, правильно связываем его
    if (curator_id !== undefined) {
      if (curator_id === null || curator_id === '') {
        updateData.curator = { disconnect: true }; // Убираем куратора
      } else {
        updateData.curator = { connect: { id: curator_id } }; // Назначаем нового
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

  async updateCourses(groupId: string, courseIds: string[]) {
    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        courses: { set: courseIds.map(id => ({ id })) }
      }
    });
  }

  async updateStudents(groupId: string, studentIds: string[]) {
    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        students: { set: studentIds.map(id => ({ id })) }
      }
    });
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