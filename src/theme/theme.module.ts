import { Module } from '@nestjs/common';
import { ThemeController } from './theme.controller';
import { ThemeService } from './theme.service';
// Скорее всего, у тебя есть отдельный модуль для Присмы. Импортируй его:
import { PrismaModule } from '../prisma/prisma.module'; // Проверь правильность пути к твоей Присме!

@Module({
  imports: [
    PrismaModule // <--- ВОТ ЭТА СТРОЧКА РЕШАЕТ ПРОБЛЕМУ с this.prisma
  ],
  controllers: [ThemeController],
  providers: [ThemeService],
})
export class ThemeModule {}