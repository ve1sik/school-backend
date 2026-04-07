// Файл: src/enrollment/enrollment.controller.ts
import { Body, Controller, Post, Get, Request, UseGuards } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollCourseDto } from './dto/enroll.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt')) // Доступ только для авторизованных
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  // Маршрут для записи
  @Post()
  async enroll(@Request() req, @Body() dto: EnrollCourseDto) {
    const userId = req.user.userId || req.user.id || req.user.sub;
    return this.enrollmentService.enroll(userId, dto.course_id);
  }

  // Маршрут для вывода своих курсов
  @Get('my')
  async getMyCourses(@Request() req) {
    const userId = req.user.userId || req.user.id || req.user.sub;
    return this.enrollmentService.getMyCourses(userId);
  }
}