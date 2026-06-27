import { Controller, Post, Get, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { SubmissionsService } from './submissions.service';
import { Permissions } from '../auth/permissions.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Permissions('CURATOR_DASHBOARD')
  @Post('oral')
  createOralSubmission(@Body() body: any, @Request() req) {
    return this.submissionsService.createOralSubmission(body, req.user.sub, req.user.role);
  }

  @Permissions('CURATOR_DASHBOARD')
  @Get('oral/:studentId/:lessonId')
  getOralSubmission(
    @Param('studentId') studentId: string,
    @Param('lessonId') lessonId: string,
    @Request() req,
  ) {
    return this.submissionsService.getOralSubmission(studentId, lessonId, req.user.sub, req.user.role);
  }

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

  // Очередь работ для куратора (PENDING / GRADED) — с фильтром по группам если CURATOR
  @Permissions('CURATOR_DASHBOARD')
  @Get()
  getSubmissionsByStatus(@Query('status') status: string, @Request() req) {
    const finalStatus = status === 'GRADED' ? 'GRADED' : 'PENDING';
    return this.submissionsService.getSubmissionsByStatus(
      finalStatus,
      req.user.sub,
      req.user.role,
    );
  }

  @Permissions('CURATOR_DASHBOARD')
  @Get('pending')
  getPending(@Request() req) {
    return this.submissionsService.getSubmissionsByStatus(
      'PENDING',
      req.user.sub,
      req.user.role,
    );
  }

  // Куратор оценивает работу (или возвращает на доработку)
  @Permissions('CURATOR_DASHBOARD')
  @Patch(':id/grade')
  gradeSubmission(@Param('id') id: string, @Body() body: any) {
    return this.submissionsService.gradeSubmission(
      id,
      body.score,
      body.comment,
      body.status,
      {
        criteriaScores: body.criteriaScores,
        errorAnnotations: body.errorAnnotations,
      },
    );
  }

  // Студент запрашивает свою сданную работу (в конкретном уроке)
  @Get('lesson/:lessonId')
  getMySubmission(@Request() req, @Param('lessonId') lessonId: string) {
    return this.submissionsService.getSubmissionForStudent(lessonId, req.user.sub);
  }

  // Студент: лёгкий список работ для дашборда (без длинных answer/question)
  @Get('my/summary')
  getMySubmissionsSummary(@Request() req) {
    return this.submissionsService.getMySubmissionsSummary(req.user.sub);
  }

  // Студент запрашивает все свои работы
  @Get('my')
  getMySubmissions(@Request() req) {
    return this.submissionsService.getMySubmissions(req.user.sub);
  }
}
