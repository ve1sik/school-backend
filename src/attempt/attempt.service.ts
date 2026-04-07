// Файл: src/attempt/attempt.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitTestDto } from './dto/submit.dto';

@Injectable()
export class AttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async submitTest(userId: string, dto: SubmitTestDto) {
    const test = await this.prisma.test.findUnique({
      where: { id: dto.test_id },
      include: { questions: true },
    });

    if (!test) throw new BadRequestException('Тест не найден.');

    const attemptsCount = await this.prisma.testAttempt.count({
      where: { test_id: dto.test_id, user_id: userId },
    });

    if (attemptsCount >= test.max_attempts) {
      throw new BadRequestException('Лимит попыток для этого теста исчерпан.');
    }

    let totalScore = 0;
    const answersData: any[] = [];

    for (const studentAnswer of dto.answers) {
      const question = test.questions.find((q) => q.id === studentAnswer.question_id);
      if (!question) continue;

      const isCorrect = question.correct_answer === studentAnswer.user_answer;
      const pointsAwarded = isCorrect ? question.points : 0;
      
      totalScore += pointsAwarded;

      answersData.push({
        question_id: question.id,
        user_answer: studentAnswer.user_answer,
        is_correct: isCorrect,
      });
    }

    // Бронебойный метод сохранения через connect
    const newAttempt = await this.prisma.testAttempt.create({
      data: {
        test: { connect: { id: dto.test_id } },
        user: { connect: { id: userId } },
        score: totalScore,
        attempt_number: attemptsCount + 1,
        answers: {
          create: answersData,
        },
      },
      include: {
        answers: true, // Возвращаем результат вместе с разбором ответов
      },
    });

    return newAttempt;
  }
}