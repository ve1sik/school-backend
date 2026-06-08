import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const userListSelect = {
  id: true,
  email: true,
  role: true,
  admin_permissions: true,
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

  async findAll(skip?: number, take?: number, requesterId?: string, requesterRole?: string, requesterPermissions: string[] = []) {
    if (requesterRole === 'CURATOR' && requesterId && !requesterPermissions.includes('MANAGE_USERS')) {
      const groups = await this.prisma.group.findMany({
        where: {
          OR: [
            { curator_id: requesterId },
            { teacher_id: requesterId },
          ],
        },
        select: {
          curator_id: true,
          teacher_id: true,
          students: { select: { id: true } },
        },
      });

      const scopedIds = new Set<string>([requesterId]);
      groups.forEach((group) => {
        if (group.curator_id) scopedIds.add(group.curator_id);
        if (group.teacher_id) scopedIds.add(group.teacher_id);
        group.students.forEach((student) => scopedIds.add(student.id));
      });

      if (scopedIds.size === 0) return [];
      return this.prisma.user.findMany({
        where: { id: { in: [...scopedIds] } },
        select: userListSelect,
        orderBy: { created_at: 'desc' },
      });
    }

    return this.prisma.user.findMany({
      select: userListSelect,
      orderBy: { created_at: 'desc' },
      ...(skip !== undefined && !Number.isNaN(skip) ? { skip } : {}),
      ...(take !== undefined && !Number.isNaN(take) ? { take } : {}),
    });
  }

  async findAllStudents(requesterId?: string, requesterRole?: string, requesterPermissions: string[] = []) {
    if (requesterRole === 'CURATOR' && requesterId && !requesterPermissions.includes('MANAGE_USERS')) {
      const groups = await this.prisma.group.findMany({
        where: {
          OR: [
            { curator_id: requesterId },
            { teacher_id: requesterId },
          ],
        },
        select: { students: { select: { id: true } } },
      });
      const studentIds = [...new Set(groups.flatMap((g) => g.students.map((s) => s.id)))];
      if (studentIds.length === 0) return [];
      return this.prisma.user.findMany({
        where: { id: { in: studentIds }, role: 'STUDENT' },
        select: { id: true, name: true, surname: true, email: true, avatar: true },
        orderBy: { created_at: 'desc' },
      });
    }

    return this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, surname: true, email: true, avatar: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAllCurators(requesterId?: string, requesterRole?: string, requesterPermissions: string[] = []) {
    if (requesterRole === 'CURATOR' && requesterId && !requesterPermissions.includes('MANAGE_USERS')) {
      return this.prisma.user.findMany({
        where: { id: requesterId },
        select: { id: true, name: true, surname: true, email: true, avatar: true },
      });
    }

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

  async updateUser(
    id: string,
    dto: { role?: Role; name?: string; surname?: string; email?: string; password?: string; admin_permissions?: string[] },
    requesterRole?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const data: any = {};
    if (dto.role) data.role = dto.role;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.surname !== undefined) data.surname = dto.surname;
    if (dto.email) data.email = dto.email;
    if (dto.password) data.password_hash = await bcrypt.hash(dto.password, 10);
    if (dto.admin_permissions !== undefined) {
      if (requesterRole !== 'ADMIN') {
        throw new BadRequestException('Только администратор может менять доступы к админкам');
      }
      data.admin_permissions = Array.isArray(dto.admin_permissions) ? dto.admin_permissions : [];
    }

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
