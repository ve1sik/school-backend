// Файл: src/lesson/dto/lesson.dto.ts
import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  video_url?: string; // Ссылка на видос (YouTube, Vimeo и тд)

  @IsString()
  @IsOptional()
  content?: string; // Текстовое описание или конспект

  @IsString()
  theme_id: string; // ID темы, к которой относится урок

  @IsInt()
  order_index: number; // Порядковый номер урока (1, 2, 3...)
}