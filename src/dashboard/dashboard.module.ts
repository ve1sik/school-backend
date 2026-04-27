import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AiService } from './ai.service'; // 🔥 Наш новый сервис
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService, AiService], // 🔥 Регистрируем AiService
  exports: [DashboardService],
})
export class DashboardModule {}