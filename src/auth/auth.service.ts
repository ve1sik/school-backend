import { ForbiddenException, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async issueTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const access_token = this.jwt.sign(payload, { expiresIn: '1d' });
    const refresh_token = this.jwt.sign(payload, { expiresIn: '7d' });
    return { access_token, refresh_token };
  }

  // 1. РЕГИСТРАЦИЯ СТУДЕНТА
  async register(dto: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    
    if (existingUser) {
      throw new BadRequestException('Пользователь с таким email уже существует.');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.password, salt);

    await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: hash,
      },
    });

    return this.login(dto);
  }

  // 2. ЛОГИН (Универсальный)
  async login(dto: any) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Неверный email или пароль');

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) throw new UnauthorizedException('Неверный email или пароль');

    const tokens = await this.issueTokens(user.id, user.email, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: tokens.refresh_token },
    });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  // 3. ПОЛУЧЕНИЕ ДАННЫХ О СЕБЕ
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException();
    
    const { password_hash, refresh_token, ...result } = user;
    return result;
  }

  // 4. ОБНОВЛЕНИЕ ПРОФИЛЯ
  async updateProfile(userId: string, dto: any) {
    const dataToUpdate: any = {};
    if (dto.email) dataToUpdate.email = dto.email;
    if (dto.name) dataToUpdate.name = dto.name;
    if (dto.surname) dataToUpdate.surname = dto.surname;
    if (dto.patronymic) dataToUpdate.patronymic = dto.patronymic;
    if (dto.birthday) dataToUpdate.birthday = dto.birthday;
    if (dto.city) dataToUpdate.city = dto.city;
    if (dto.avatar) dataToUpdate.avatar = dto.avatar;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    const { password_hash, refresh_token, ...result } = updatedUser;
    return { message: 'Профиль обновлен', user: result };
  }

  // --- РОДИТЕЛЬСКИЙ КОНТРОЛЬ ---

  // 5. ГЕНЕРАЦИЯ КОДА (Для студента)
  async generateInviteCode(userId: string) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await this.prisma.user.update({
      where: { id: userId },
      data: { invite_code: code },
    });
    return { code };
  }

  // 6. РЕГИСТРАЦИЯ РОДИТЕЛЯ С ПРИВЯЗКОЙ
  async registerParent(dto: any) {
    // Проверяем код ребенка
    const student = await this.prisma.user.findUnique({
      where: { invite_code: dto.invite_code }
    });

    if (!student) {
      throw new BadRequestException('Неверный код доступа ребенка. Проверьте код.');
    }

    // Проверяем почту
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('Пользователь с таким email уже существует');

    // Хэшируем пароль
    const hash = await bcrypt.hash(dto.password, 10);

    // Создаем родителя
    const parent = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: hash,
        role: 'PARENT',
        name: dto.name,
        surname: dto.surname,
      }
    });

    // Вяжем ребенка к родителю
    await this.prisma.user.update({
      where: { id: student.id },
      data: { 
        parent_id: parent.id,
        invite_code: null // Сгорает после использования
      }
    });

    return this.login({ email: dto.email, password: dto.password });
  }

  // 7. ПРИВЯЗКА УЖЕ СУЩЕСТВУЮЩЕГО РОДИТЕЛЯ
  async linkToStudent(parentId: string, inviteCode: string) {
    const student = await this.prisma.user.findUnique({
      where: { invite_code: inviteCode }
    });

    if (!student) throw new BadRequestException('Код не найден');

    await this.prisma.user.update({
      where: { id: student.id },
      data: { parent_id: parentId, invite_code: null }
    });

    return { message: 'Связь установлена!' };
  }

  // 8. СПИСОК ДЕТЕЙ
  async getChildren(parentId: string) {
    return this.prisma.user.findMany({
      where: { parent_id: parentId },
      select: {
        id: true,
        name: true,
        surname: true,
        avatar: true,
        test_attempts: {
          take: 5,
          orderBy: { created_at: 'desc' },
          include: { test: true }
        }
      }
    });
  }
}