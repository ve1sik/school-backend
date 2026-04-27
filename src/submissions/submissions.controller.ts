import { Controller, Post, Get, Patch, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  createSubmission(@Headers('authorization') auth: string, @Body() body: any) {
    if (!auth) throw new UnauthorizedException('Нет токена');
    
    // Бронебойный способ достать ID ученика из токена
    const token = auth.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub || payload.id; 

    return this.submissionsService.createSubmission(userId, body);
  }

  @Get('pending')
  getPending() {
    return this.submissionsService.getPendingSubmissions();
  }

  @Patch(':id/grade')
  gradeSubmission(@Param('id') id: string, @Body() body: any) {
    return this.submissionsService.gradeSubmission(id, body.score, body.comment);
  }

  // 🔥 НОВЫЙ ЭНДПОИНТ: Студент запрашивает свою сданную работу
  @Get('lesson/:lessonId')
  getMySubmission(@Headers('authorization') auth: string, @Param('lessonId') lessonId: string) {
    if (!auth) throw new UnauthorizedException('Нет токена');

    // Тот же бронебойный способ из Post, чтобы 100% достать твой ID
    const token = auth.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub || payload.id;

    return this.submissionsService.getSubmissionForStudent(lessonId, userId);
  }
  @Get('my')
  getMySubmissions(@Headers('authorization') auth: string) {
    if (!auth) throw new UnauthorizedException('Нет токена');
    const token = auth.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub || payload.id;
    
    return this.submissionsService.getMySubmissions(userId);
  }
}