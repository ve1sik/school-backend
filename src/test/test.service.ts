// Файл: src/test/test.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestDto } from './dto/test.dto';

@Injectable()
export class TestService {
  constructor(private readonly prisma: PrismaService) {}

  // Создать тест
  async createTest(dto: CreateTestDto) {
    return this.prisma.test.create({
      data: {
        title: dto.title,
        theme_id: dto.theme_id,
        max_attempts: dto.max_attempts,
      },
    });
  }

  // Получить тесты по ID темы (вместе с будущими вопросами)
  async getByTheme(themeId: string) {
    return this.prisma.test.findMany({
      where: { theme_id: themeId },
      include: { questions: true }, // Сразу подтягиваем вопросы к тесту
    });
  }
}