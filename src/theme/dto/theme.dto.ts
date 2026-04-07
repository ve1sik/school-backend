// Файл: src/theme/dto/theme.dto.ts
import { IsString, IsInt } from 'class-validator';

export class CreateThemeDto {
  @IsString()
  title: string;

  @IsString()
  course_id: string;

  @IsInt()
  order_index: number;
}