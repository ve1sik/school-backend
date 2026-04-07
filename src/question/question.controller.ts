// Файл: src/question/question.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/question.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  // Создать вопрос (Только Админ)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateQuestionDto) {
    return this.questionService.create(dto);
  }

  // Получить вопросы теста (Доступно всем авторизованным)
  @UseGuards(AuthGuard('jwt'))
  @Get('test/:testId')
  async getByTest(@Param('testId') testId: string) {
    return this.questionService.getByTest(testId);
  }
}