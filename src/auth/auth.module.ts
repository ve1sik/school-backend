import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service'; // <--- ДОБАВЬ ЭТОТ ИМПОРТ

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'secretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  // ДОБАВЛЯЕМ PrismaService В СПИСОК НИЖЕ
  providers: [AuthService, JwtStrategy, PrismaService], 
  exports: [AuthService],
})
export class AuthModule {}