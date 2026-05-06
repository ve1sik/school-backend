import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAllStudents() {
    return this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, surname: true, email: true, avatar: true },
      orderBy: { created_at: 'desc' }
    });
  }

  // 🔥 НОВЫЙ МЕТОД: Достаем всех кураторов
  async findAllCurators() {
    return this.prisma.user.findMany({
      where: { role: 'CURATOR' }, // Тянем только тех, у кого роль CURATOR
      select: { id: true, name: true, surname: true, email: true, avatar: true },
      orderBy: { created_at: 'desc' }
    });
  }
}