// Файл: src/lesson/lesson.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/lesson.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // Создать урок (Только Админ)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateLessonDto) {
    return this.lessonService.create(dto);
  }

  // Получить уроки по ID темы (Доступно всем авторизованным или вообще всем - пока оставим открытым для тестов)
  @Get('theme/:themeId')
  async getByTheme(@Param('themeId') themeId: string) {
    return this.lessonService.getByTheme(themeId);
  }
}