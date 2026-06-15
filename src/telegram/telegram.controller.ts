import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  /**
   * Telegram шлёт обновления сюда.
   * Отвечаем { ok: true } МГНОВЕННО, обработка идёт асинхронно в фоне.
   * Это устраняет таймаут 800ms и делает бота быстрым.
   */
  @Post('webhook')
  handleWebhook(@Body() update: any) {
    this.telegramService.handleUpdate(update); // fire-and-forget
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('link-code')
  getLinkCode(@Request() req) {
    return this.telegramService.ensureTelegramCode(req.user.sub);
  }

  @Get('register-commands')
  registerCommands() {
    return this.telegramService.registerBotCommands();
  }

  @Get('health')
  health() {
    return this.telegramService.health();
  }

  @Get('test-send')
  testSend(@Query('chatId') chatId: string) {
    return this.telegramService.testSend(chatId);
  }
}
