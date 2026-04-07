// Файл: src/question/question.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/question.dto';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  // Создать вопрос
  async create(dto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: {
        test_id: dto.test_id,
        type: dto.type as any, // Приводим тип для Prisma
        content: dto.content,
        correct_answer: dto.correct_answer,
        points: dto.points,
      },
    });
  }

  // Получить все вопросы конкретного теста
  async getByTest(testId: string) {
    return this.prisma.question.findMany({
      where: { test_id: testId },
    });
  }
}