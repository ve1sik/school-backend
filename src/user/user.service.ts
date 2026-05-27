import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  async findAllTeachers() {
    return this.prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: { id: true, name: true, surname: true, email: true, avatar: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async createUser(dto: { email: string; password: string; name?: string; surname?: string; role?: Role }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Пользователь с таким email уже существует');

    const hash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: hash,
        name: dto.name,
        surname: dto.surname,
        role: dto.role || 'STUDENT',
      },
      select: userListSelect,
    });
  }

  async updateUser(id: string, dto: { role?: Role; name?: string; surname?: string; email?: string; password?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const data: any = {};
    if (dto.role) data.role = dto.role;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.surname !== undefined) data.surname = dto.surname;
    if (dto.email) data.email = dto.email;
    if (dto.password) data.password_hash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({ where: { id }, data, select: userListSelect });
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
