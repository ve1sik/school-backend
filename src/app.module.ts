import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Твои модули
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './course/course.module'; 
import { ThemeModule } from './theme/theme.module';
import { LessonModule } from './lesson/lesson.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ScheduleModule } from './schedule/schedule.module'; 
// 🔥 ДОБАВИЛИ НАШ НОВЫЙ МОДУЛЬ ГРУПП
import { GroupModule } from './group/group.module';

// Контроллер загрузки
import { UploadController } from './upload/upload.controller';

@Module({
  imports: [
    // РАЗДАЧА СТАТИКИ
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/api/uploads', 
    }),
    
    PrismaModule,
    AuthModule,
    CoursesModule,
    ThemeModule,
    LessonModule,
    DashboardModule,
    SubmissionsModule,
    ScheduleModule,
    GroupModule, // 🔥 РЕГИСТРИРУЕМ МОДУЛЬ ЗДЕСЬ
  ],
  controllers: [
    UploadController,
  ],
  providers: [],
})
export class AppModule {}