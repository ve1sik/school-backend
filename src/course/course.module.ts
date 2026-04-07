import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service'; // Тот самый путь, который мы нашли!

@Module({
  imports: [AuthModule],
  controllers: [CourseController],
  providers: [CourseService, PrismaService], // Теперь PrismaService доступен сервису
  exports: [CourseService],
})
export class CoursesModule {}