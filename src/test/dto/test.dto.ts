// Файл: src/test/dto/test.dto.ts
import { IsString, IsInt } from 'class-validator';

export class CreateTestDto {
  @IsString()
  title: string;

  @IsString()
  theme_id: string; // ID темы, к которой крепится тест

  @IsInt()
  max_attempts: number; // Максимальное количество попыток
}