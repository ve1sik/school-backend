// Файл: src/theme/theme.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ThemeService } from './theme.service';
import { CreateThemeDto } from './dto/theme.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  // Создать тему (Только Админ)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateThemeDto) {
    return this.themeService.create(dto);
  }

  // Получить все темы курса по его ID
  @Get('course/:courseId')
  async getByCourse(@Param('courseId') courseId: string) {
    return this.themeService.getByCourse(courseId);
  }
}