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
    return this.prisma.group.update({ where: { id }, data });
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

  // 🔥 НОВЫЙ МЕТОД ДЛЯ МАГАЗИНА
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