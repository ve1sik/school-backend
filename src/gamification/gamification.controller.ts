import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamificationService } from './gamification.service';

@UseGuards(AuthGuard('jwt'))
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.gamificationService.getProfile(req.user.sub);
  }

  @Get('leaderboard')
  getLeaderboard(@Request() req) {
    return this.gamificationService.getLeaderboard(req.user.sub);
  }
}
