import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DeckService } from './deck.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('decks')
export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  @Roles('ADMIN', 'CURATOR', 'STUDENT')
  @Get()
  findAll() {
    return this.deckService.findAll();
  }

  @Roles('ADMIN', 'CURATOR', 'STUDENT')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deckService.findOne(id);
  }

  @Roles('ADMIN', 'CURATOR')
  @Post()
  create(@Body() body: { title: string; description?: string; lesson_id?: string }) {
    return this.deckService.create(body);
  }

  @Roles('ADMIN', 'CURATOR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { title?: string; description?: string; lesson_id?: string | null }) {
    return this.deckService.update(id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deckService.remove(id);
  }

  @Roles('ADMIN', 'CURATOR')
  @Post(':id/cards')
  addCard(@Param('id') id: string, @Body() body: { front: string; back: string }) {
    return this.deckService.addCard(id, body);
  }

  @Roles('ADMIN', 'CURATOR')
  @Post(':id/cards/bulk')
  bulkSave(@Param('id') id: string, @Body() body: { cards: { front: string; back: string }[] }) {
    return this.deckService.bulkSaveCards(id, body.cards);
  }

  @Roles('ADMIN', 'CURATOR')
  @Patch('cards/:cardId')
  updateCard(@Param('cardId') cardId: string, @Body() body: { front?: string; back?: string }) {
    return this.deckService.updateCard(cardId, body);
  }

  @Roles('ADMIN', 'CURATOR')
  @Delete('cards/:cardId')
  removeCard(@Param('cardId') cardId: string) {
    return this.deckService.removeCard(cardId);
  }
}
