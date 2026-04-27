import { Controller, Post, Body, Patch, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: any) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: any) {
    return this.authService.login(dto);
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
  @Post('invite-code')
  async generateCode(@Request() req) {
    return this.authService.generateInviteCode(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('link-student')
  async linkStudent(@Request() req, @Body('code') code: string) {
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