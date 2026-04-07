// Файл: src/attempt/attempt.module.ts
import { Module } from '@nestjs/common';
import { AttemptService } from './attempt.service';
import { AttemptController } from './attempt.controller';

@Module({
  controllers: [AttemptController],
  providers: [AttemptService],
})
export class AttemptModule {}