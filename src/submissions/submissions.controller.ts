import { Controller, Post, Get, Patch, Body, Param, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // 1. Студент сдает работу
  @Post()
  createSubmission(@Headers('authorization') auth: string, @Body() body: any) {
    if (!auth) throw new UnauthorizedException('Нет токена');
    
    const token = auth.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub || payload.id; 

    return this.submissionsService.createSubmission(userId, body);
  }

  // 🔥 2. НОВЫЙ ЭНДПОИНТ ДЛЯ КУРАТОРА: Запрос работ по статусу (PENDING или GRADED)
  @Get()
  getSubmissionsByStatus(@Headers('authorization') auth: string, @Query('status') status: string) {
    if (!auth) throw new UnauthorizedException('Нет токена');
    const finalStatus = status === 'GRADED' ? 'GRADED' : 'PENDING';
    return this.submissionsService.getSubmissionsByStatus(finalStatus);
  }

  // (Оставили на всякий случай, если фронт где-то еще использует старый путь)
  @Get('pending')
  getPending() {
    return this.submissionsService.getSubmissionsByStatus('PENDING');
  }

  // 3. Куратор оценивает работу
  @Patch(':id/grade')
  gradeSubmission(@Headers('authorization') auth: string, @Param('id') id: string, @Body() body: any) {
    if (!auth) throw new UnauthorizedException('Нет токена');
    return this.submissionsService.gradeSubmission(id, body.score, body.comment);
  }

  // 4. Студент запрашивает свою сданную работу (в конкретном уроке)
  @Get('lesson/:lessonId')
  getMySubmission(@Headers('authorization') auth: string, @Param('lessonId') lessonId: string) {
    if (!auth) throw new UnauthorizedException('Нет токена');

    const token = auth.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub || payload.id;

    return this.submissionsService.getSubmissionForStudent(lessonId, userId);
  }

  // 5. Студент запрашивает все свои работы
  @Get('my')
  getMySubmissions(@Headers('authorization') auth: string) {
    if (!auth) throw new UnauthorizedException('Нет токена');
    const token = auth.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub || payload.id;
    
    return this.submissionsService.getMySubmissions(userId);
  }
}