import { Module } from '@nestjs/common';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { PrismaModule } from '../prisma/prisma.module'; // Подключаем Присму

@Module({
  imports: [PrismaModule],
  controllers: [LessonController],
  providers: [LessonService],
})
export class LessonModule {}