// Файл: src/attempt/attempt.controller.ts
import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AttemptService } from './attempt.service';
import { SubmitTestDto } from './dto/submit.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('attempts')
export class AttemptController {
  constructor(private readonly attemptService: AttemptService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('submit')
  async submit(@Request() req, @Body() dto: SubmitTestDto) {
    // Достаем ID максимально надежно:
    const userId = req.user.userId || req.user.id || req.user.sub;
    return this.attemptService.submitTest(userId, dto);
  }
}