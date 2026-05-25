import { Controller, Get, Post, Body, Query, Request, UseGuards } from '@nestjs/common';
import { FlashcardService } from './flashcard.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('flashcards')
export class FlashcardController {
  constructor(private readonly flashcardService: FlashcardService) {}

  @Get('due')
  getDue(@Request() req, @Query('deckId') deckId?: string) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.flashcardService.getDueCards(userId, deckId);
  }

  @Get('stats')
  getStats(@Request() req) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.flashcardService.getStats(userId);
  }

  @Post('review')
  submitReview(
    @Request() req,
    @Body() body: { flashcardId: string; rating: 0 | 1 | 2 },
  ) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.flashcardService.submitReview(userId, body.flashcardId, body.rating);
  }
}
