// Файл: src/question/dto/question.dto.ts
import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  test_id: string; // К какому тесту крепим

  @IsString()
  type: string; // 'AUTO', 'MANUAL' или 'ORAL'

  @IsString()
  content: string; // Сам текст вопроса

  @IsString()
  @IsOptional()
  correct_answer?: string; // Правильный ответ (необязательно для устных)

  @IsInt()
  points: number; // Сколько баллов даем за правильный ответ
}