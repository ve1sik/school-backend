import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DeckService } from './deck.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../auth/permissions.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('decks')
export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  @Roles('ADMIN', 'CURATOR', 'TEACHER', 'STUDENT')
  @Get()
  findAll() {
    return this.deckService.findAll();
  }

  @Roles('ADMIN', 'CURATOR', 'TEACHER', 'STUDENT')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deckService.findOne(id);
  }

  @Permissions('MANAGE_DECKS')
  @Post()
  create(@Body() body: { title: string; description?: string; lesson_id?: string }) {
    return this.deckService.create(body);
  }

  @Permissions('MANAGE_DECKS')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { title?: string; description?: string; lesson_id?: string | null }) {
    return this.deckService.update(id, body);
  }

  @Permissions('MANAGE_DECKS')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deckService.remove(id);
  }

  @Permissions('MANAGE_DECKS')
  @Post(':id/cards')
  addCard(@Param('id') id: string, @Body() body: { front: string; back: string }) {
    return this.deckService.addCard(id, body);
  }

  @Permissions('MANAGE_DECKS')
  @Post(':id/cards/bulk')
  bulkSave(@Param('id') id: string, @Body() body: { cards: { front: string; back: string }[] }) {
    return this.deckService.bulkSaveCards(id, body.cards);
  }

  @Permissions('MANAGE_DECKS')
  @Patch('cards/:cardId')
  updateCard(@Param('cardId') cardId: string, @Body() body: { front?: string; back?: string }) {
    return this.deckService.updateCard(cardId, body);
  }

  @Permissions('MANAGE_DECKS')
  @Delete('cards/:cardId')
  removeCard(@Param('cardId') cardId: string) {
    return this.deckService.removeCard(cardId);
  }
}
