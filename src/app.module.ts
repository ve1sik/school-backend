import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './course/course.module'; // Путь к папке БЕЗ "s"

@Module({
  imports: [
    AuthModule, 
    CoursesModule
  ],
})
export class AppModule {}