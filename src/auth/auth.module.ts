import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service'; 

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      // 🔥 ИСПРАВЛЕНО: Теперь ключ точно такой же, как в стратегии
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key_2026_top_school',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService], 
  exports: [AuthService],
})
export class AuthModule {}