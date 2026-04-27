import { Module } from '@nestjs/common';
import { CourseController } from './course.controller'; // <-- Убедись, что есть импорт
import { CourseService } from './course.service';
// ... твои другие импорты

@Module({
  imports: [ /* твои импорты, например PrismaModule */ ],
  controllers: [CourseController], // <--- ВОТ ЭТО САМОЕ ГЛАВНОЕ!
  providers: [CourseService],
})
export class CoursesModule {}