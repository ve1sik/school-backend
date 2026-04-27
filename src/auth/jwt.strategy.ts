import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { 
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Тот самый ключ. Теперь они с модулем работают в паре!
      secretOrKey: process.env.JWT_SECRET || 'super_secret_jwt_key_2026_top_school',
    });
  }

  async validate(payload: any) {
    // Возвращаем sub, чтобы в контроллере req.user.sub сработал четко
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}