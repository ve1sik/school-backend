import { Body, Controller, Delete, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
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
  /**
   * Telegram шлёт обновления сюда.
   * Ожидаем Promise и возвращаем JSON Telegram'у — это Webhook Reply.
   * Telegram принимает ответ и СРАЗУ отправляет сообщение пользователю.
   * Никаких исходящих запросов с сервера не требуется.
   */
  @Post('webhook')
  handleWebhook(@Body() update: any) {
    return this.telegramService.handleUpdate(update);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('link-code')
  getLinkCode(@Request() req) {
    return this.telegramService.ensureTelegramCode(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('link')
  unlinkTelegram(@Request() req) {
    return this.telegramService.unlinkTelegram(req.user.sub);
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
