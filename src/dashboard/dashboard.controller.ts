import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // 1. Общая статистика
  @Get('analytics')
  async getAnalytics(@Request() req: any) {
    return this.dashboardService.getStudentAnalytics(req.user.sub);
  }

  // 2. Выгрузка ошибок по конкретной теме
  @Get('mistakes/:themeId')
  async getMistakes(@Request() req: any, @Param('themeId') themeId: string) {
    return this.dashboardService.getMistakesWork(req.user.sub, themeId);
  }

  // 3. Прием результатов пройденного теста
  @Post('save-result')
  async saveResult(@Request() req: any, @Body() body: any) {
    return this.dashboardService.saveTestResult(req.user.sub, body.testId, body.score, body.answers);
  }
}
