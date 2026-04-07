// Файл: src/test/test.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TestService } from './test.service';
import { CreateTestDto } from './dto/test.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('tests')
export class TestController {
  constructor(private readonly testService: TestService) {}

  // Создать тест (Только Админ)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateTestDto) {
    return this.testService.createTest(dto);
  }

  // Получить тесты темы (Доступно всем авторизованным)
  @UseGuards(AuthGuard('jwt'))
  @Get('theme/:themeId')
  async getByTheme(@Param('themeId') themeId: string) {
    return this.testService.getByTheme(themeId);
  }
}