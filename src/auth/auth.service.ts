// Файл: src/auth/auth.service.ts (Полный код с защитой от дубликатов)
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
    const access_token = this.jwt.sign(payload, { expiresIn: '15m' });
    const refresh_token = this.jwt.sign(payload, { expiresIn: '7d' });
    return { access_token, refresh_token };
  }

  // 1. РЕГИСТРАЦИЯ
  async register(dto: any) {
    // ПРОФИЛАКТИКА 500 ОШИБКИ: Сначала проверяем, есть ли уже такой email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    
    // Если есть — красиво и понятно отказываем (Статус 400)
    if (existingUser) {
      throw new BadRequestException('Пользователь с таким email уже существует.');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash: hash,
      },
    });

    return this.login(dto);
  }

  // 2. ЛОГИН
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

  // 3. ОБНОВЛЕНИЕ ТОКЕНОВ (Refresh)
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.refresh_token !== refreshToken) {
      throw new ForbiddenException('Доступ запрещен (токен недействителен)');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: tokens.refresh_token },
    });

    return tokens;
  }
}