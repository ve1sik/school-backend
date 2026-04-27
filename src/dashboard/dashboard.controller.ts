import { Controller, Get, Post, Body, Param, Req, UnauthorizedException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Вспомогательная функция для ручной расшифровки токена
  private getUserIdFromToken(req: any): string {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен не найден');
    }
    const token = authHeader.split(' ')[1];
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    
    const userId = decodedPayload.id || decodedPayload.userId || decodedPayload.sub;
    if (!userId) {
      throw new UnauthorizedException('Не удалось найти ID');
    }
    return userId;
  }

  // 1. Маршрут для общей статистики
  @Get('analytics')
  async getAnalytics(@Req() req: any) {
    try {
      const userId = this.getUserIdFromToken(req);
      return await this.dashboardService.getStudentAnalytics(userId);
    } catch (error) {
      console.error('Ошибка в аналитике:', error);
      throw new UnauthorizedException('Ошибка доступа');
    }
  }

  // 2. Маршрут: Выгрузка ошибок по конкретной теме
  @Get('mistakes/:themeId')
  async getMistakes(@Req() req: any, @Param('themeId') themeId: string) {
    try {
      const userId = this.getUserIdFromToken(req);
      return await this.dashboardService.getMistakesWork(userId, themeId);
    } catch (error) {
      console.error('Ошибка в выгрузке ошибок:', error);
      throw new UnauthorizedException('Ошибка доступа');
    }
  }

  // 3. ТОТ САМЫЙ МАРШРУТ, КОТОРЫЙ ОТДАВАЛ 404: Прием результатов пройденного теста
  @Post('save-result')
  async saveResult(@Req() req: any, @Body() body: any) {
    try {
      const userId = this.getUserIdFromToken(req);
      return await this.dashboardService.saveTestResult(userId, body.testId, body.score, body.answers);
    } catch (error) {
      console.error('Ошибка сохранения теста:', error);
      throw new UnauthorizedException('Не удалось сохранить результаты теста');
    }
  }
}