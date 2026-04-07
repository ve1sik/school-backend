// Файл: src/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { 
  // Тут должен быть второй аргумент 'jwt', если ты используешь AuthGuard('jwt')
  constructor() {
    super({
      // Берем токен из заголовка запроса (Bearer token)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Тот самый секретный ключ из твоего .env файла
      secretOrKey: process.env.JWT_SECRET || 'super_secret_jwt_key_2026_top_school',
    });
  }

  async validate(payload: any) {
    // Если токен верный, эта функция вернет данные юзера,
    // и они будут доступны в контроллерах как request.user
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}