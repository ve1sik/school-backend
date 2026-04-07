// Файл: src/course/dto/course.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional() // Это значит, что поле необязательное
  description?: string;

  @IsString()
  @IsOptional()
  cover_url?: string;
}