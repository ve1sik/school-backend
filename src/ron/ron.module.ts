import { Module } from '@nestjs/common';
import { RonController } from './ron.controller';
import { RonService } from './ron.service';

@Module({
  controllers: [RonController],
  providers: [RonService],
  exports: [RonService],
})
export class RonModule {}
