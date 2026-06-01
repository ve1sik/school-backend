import { Controller, Get, Post, Body, Param, Request, BadRequestException, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('contacts')
  async getContacts(@Request() req) {
    return this.messagesService.getContacts(req.user.sub, req.user.role);
  }

  // 🔥 СТРОГО ДО :id
  @Get('unread')
  async getUnreadCount(@Request() req) {
    return this.messagesService.getUnreadCount(req.user.sub);
  }

  @Get(':id')
  async getHistory(@Request() req, @Param('id') contactId: string) {
    return this.messagesService.getHistory(req.user.sub, contactId);
  }

  @Post(':id')
  async sendMessage(@Request() req, @Param('id') contactId: string, @Body('text') text: string) {
    if (!text || !text.trim()) throw new BadRequestException('Пустое сообщение');
    return this.messagesService.sendMessage(req.user.sub, contactId, text);
  }
}
