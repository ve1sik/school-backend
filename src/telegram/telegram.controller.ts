import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  // Telegram шлёт сюда обновления (messages / callback_query)
  // Отвечаем напрямую в HTTP-ответе — исходящих запросов при интерактиве нет
  @Post('webhook')
  handleWebhook(@Body() update: any) {
    return this.telegramService.handleUpdate(update);
  }

  // Получить код и ссылку на бота (вызывается с сайта)
  @UseGuards(AuthGuard('jwt'))
  @Get('link-code')
  getLinkCode(@Request() req) {
    return this.telegramService.ensureTelegramCode(req.user.sub);
  }

  // Повторная регистрация команд бота (полезно после смены токена)
  @Get('register-commands')
  registerCommands() {
    return this.telegramService.registerBotCommands();
  }

  // Тестовая отправка — проверить исходящее соединение
  @Get('test-send')
  testSend(@Query('chatId') chatId: string) {
    return this.telegramService.testSend(chatId);
  }
}
