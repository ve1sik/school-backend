// Файл: src/attempt/dto/submit.dto.ts
import { IsString, IsArray } from 'class-validator';

export class SubmitTestDto {
  @IsString()
  test_id: string;

  // Массив объектов: [{ question_id: "...", user_answer: "..." }]
  @IsArray()
  answers: any[]; 
}