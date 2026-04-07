// Файл: src/enrollment/dto/enroll.dto.ts
import { IsString } from 'class-validator';

export class EnrollCourseDto {
  @IsString()
  course_id: string;
}