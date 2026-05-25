import { IsOptional, IsString } from 'class-validator';

export class EnrollCourseDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  course_id?: string;
}
