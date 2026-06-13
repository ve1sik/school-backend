import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  // Telegram шлёт сюда все сообщения от пользователей
  // Мы отвечаем прямо в HTTP-ответе — никаких исходящих запросов не нужно
  @Post('webhook')
  handleWebhook(@Body() update: any) {
    return this.telegramService.handleUpdate(update);
  }

  // Получить код для привязки Telegram (вызывается с сайта)
  @UseGuards(AuthGuard('jwt'))
  @Get('link-code')
  getLinkCode(@Request() req) {
    return this.telegramService.ensureTelegramCode(req.user.sub);
  }

  // Тестовая отправка — чтобы проверить, работает ли исходящая связь
  @Get('test-send')
  testSend(@Query('chatId') chatId: string) {
    return this.telegramService.testSend(chatId);
  }
}
