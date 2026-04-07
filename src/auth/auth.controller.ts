import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Окно для регистрации (POST https://runtgenographically-conduplicate-gretta.ngrok-free.dev/auth/register)
  @Post('register')
  async register(@Body() dto: any) {
    return this.authService.register(dto);
  }

  // Окно для входа (POST https://runtgenographically-conduplicate-gretta.ngrok-free.dev/auth/login)
  @Post('login')
  async login(@Body() dto: any) {
    return this.authService.login(dto);
  }
}