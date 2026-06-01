import { Controller, Post, Body, Patch, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refresh(body?.refresh_token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  async updateProfile(@Request() req, @Body() dto: any) {
    return this.authService.updateProfile(req.user.sub, dto);
  }

  // --- РОДИТЕЛЬСКИЙ КОНТРОЛЬ ---

  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  async changePassword(@Request() req, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.sub, body.oldPassword, body.newPassword);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('invite-code')
  async generateCode(@Request() req) {
    return this.authService.generateInviteCode(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('link-student')
  async linkStudent(@Request() req, @Body() body: { code?: string; invite_code?: string }) {
    const code = body.code || body.invite_code;
    return this.authService.linkToStudent(req.user.sub, code);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('children')
  async getChildren(@Request() req) {
    return this.authService.getChildren(req.user.sub);
  }
  @Post('register-parent')
async registerParent(@Body() dto: any) {
  return this.authService.registerParent(dto);
}
}