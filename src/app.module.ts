import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Твои рабочие модули
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './course/course.module'; // 🔥 ИСПРАВЛЕНО: убрал лишнюю 's'
import { ThemeModule } from './theme/theme.module';
import { LessonModule } from './lesson/lesson.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ScheduleModule } from './schedule/schedule.module'; // 🔥 Добавили расписание

// Контроллер для загрузки файлов
import { UploadController } from './upload/upload.controller';

@Module({
  imports: [
    // Настройка раздачи статики (картинки, видео)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    
    PrismaModule,
    AuthModule,
    CoursesModule,
    ThemeModule,
    LessonModule,
    DashboardModule,
    SubmissionsModule,
    ScheduleModule, // 🔥 Не забываем про него здесь
  ],
  controllers: [
    UploadController,
  ],
  providers: [],
})
export class AppModule {}