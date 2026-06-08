import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { 
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Секрет берётся только из окружения (.env загружается в main.ts)
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: any) {
    // Возвращаем sub, чтобы в контроллере req.user.sub сработал четко
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      admin_permissions: payload.admin_permissions || [],
    };
  }
}