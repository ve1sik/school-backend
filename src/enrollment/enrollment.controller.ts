import {
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollCourseDto } from './dto/enroll.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  async enroll(@Request() req, @Body() dto: EnrollCourseDto) {
    const requesterId = req.user.sub || req.user.id || req.user.userId;
    const targetUserId = dto.userId || dto.user_id || requesterId;
    const courseId = dto.courseId || dto.course_id;

    if (!courseId) {
      throw new ForbiddenException('Не указан курс');
    }

    if (targetUserId !== requesterId && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Недостаточно прав для записи другого пользователя');
    }

    return this.enrollmentService.enroll(targetUserId, courseId);
  }

  @Get('my')
  async getMyCourses(@Request() req) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.enrollmentService.getMyCourses(userId);
  }

  @Roles('ADMIN')
  @Delete(':userId/:courseId')
  async unenroll(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.enrollmentService.unenroll(userId, courseId);
  }
}
