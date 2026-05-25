import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

const userListSelect = {
  id: true,
  email: true,
  role: true,
  name: true,
  surname: true,
  patronymic: true,
  birthday: true,
  city: true,
  avatar: true,
  created_at: true,
  enrollments: {
    include: {
      course: { select: { id: true, title: true } },
    },
  },
  groups: { select: { id: true, title: true } },
  subjects: { select: { id: true, title: true } },
} as const;

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: userListSelect,
      orderBy: { created_at: 'desc' },
    });
  }

  async findAllStudents() {
    return this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, surname: true, email: true, avatar: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAllCurators() {
    return this.prisma.user.findMany({
      where: { role: 'CURATOR' },
      select: { id: true, name: true, surname: true, email: true, avatar: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateRole(id: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: userListSelect,
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
