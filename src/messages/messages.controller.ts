import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('contacts')
  async getContacts(@Headers('authorization') auth: string) {
    if (!auth) throw new UnauthorizedException('Нет токена');
    const payload = JSON.parse(Buffer.from(auth.split(' ')[1].split('.')[1], 'base64').toString());
    return this.messagesService.getContacts(payload.sub || payload.id, payload.role);
  }

  @Get(':id')
  async getHistory(@Headers('authorization') auth: string, @Param('id') contactId: string) {
    if (!auth) throw new UnauthorizedException('Нет токена');
    const payload = JSON.parse(Buffer.from(auth.split(' ')[1].split('.')[1], 'base64').toString());
    return this.messagesService.getHistory(payload.sub || payload.id, contactId);
  }

  @Post(':id')
  async sendMessage(@Headers('authorization') auth: string, @Param('id') contactId: string, @Body('text') text: string) {
    if (!auth) throw new UnauthorizedException('Нет токена');
    if (!text || !text.trim()) throw new UnauthorizedException('Пустое сообщение');
    
    const payload = JSON.parse(Buffer.from(auth.split(' ')[1].split('.')[1], 'base64').toString());
    return this.messagesService.sendMessage(payload.sub || payload.id, contactId, text);
  }
}