import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  handleWebhook(@Body() update: any) {
    return this.telegramService.handleUpdate(update);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('link-code')
  getLinkCode(@Request() req) {
    return this.telegramService.ensureTelegramCode(req.user.sub);
  }
}
