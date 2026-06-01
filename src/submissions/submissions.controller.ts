import { Controller, Post, Get, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { SubmissionsService } from './submissions.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  createSubmission(@Request() req, @Body() body: any) {
    const userId = req.user.sub;

    if (body.autoGraded === true) {
      const score = Number(body.score) || 0;
      return this.submissionsService.createAutoGradedSubmission(
        userId,
        body,
        score,
        score > 0,
      );
    }

    return this.submissionsService.createSubmission(userId, body);
  }

  // Очередь работ для куратора (PENDING / GRADED)
  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Get()
  getSubmissionsByStatus(@Query('status') status: string) {
    const finalStatus = status === 'GRADED' ? 'GRADED' : 'PENDING';
    return this.submissionsService.getSubmissionsByStatus(finalStatus);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Get('pending')
  getPending() {
    return this.submissionsService.getSubmissionsByStatus('PENDING');
  }

  // Куратор оценивает работу (или возвращает на доработку)
  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Patch(':id/grade')
  gradeSubmission(@Param('id') id: string, @Body() body: any) {
    return this.submissionsService.gradeSubmission(id, body.score, body.comment, body.status);
  }

  // Студент запрашивает свою сданную работу (в конкретном уроке)
  @Get('lesson/:lessonId')
  getMySubmission(@Request() req, @Param('lessonId') lessonId: string) {
    return this.submissionsService.getSubmissionForStudent(lessonId, req.user.sub);
  }

  // Студент запрашивает все свои работы
  @Get('my')
  getMySubmissions(@Request() req) {
    return this.submissionsService.getMySubmissions(req.user.sub);
  }
}
