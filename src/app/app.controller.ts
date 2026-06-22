import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';

@UseGuards(AuthGuard('jwt'))
@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Один лёгкий запрос вместо /auth/me + badges при старте. */
  @Get('shell')
  getShell(@Request() req: any) {
    return this.appService.getShell(
      req.user.sub,
      req.user.role,
      req.user.admin_permissions || [],
    );
  }

  /** Тяжёлые уведомления — только по открытию колокольчика. */
  @Get('notifications')
  getNotifications(@Request() req: any) {
    return this.appService.getNotifications(req.user.sub);
  }
}
