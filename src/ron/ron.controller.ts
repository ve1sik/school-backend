import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { RonService } from './ron.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('ron')
export class RonController {
  constructor(private readonly ronService: RonService) {}

  @Get('tasks')
  listTasks(@Request() req) {
    return this.ronService.listTasks(req.user.sub);
  }

  @Get('tasks/count')
  countTasks(@Request() req) {
    return this.ronService.countTasks(req.user.sub).then((count) => ({ count }));
  }

  @Post('tasks')
  upsertTask(@Request() req, @Body() body: any) {
    return this.ronService.upsertTask(req.user.sub, body);
  }

  @Delete('tasks/:lessonId/:blockId')
  removeTask(@Request() req, @Param('lessonId') lessonId: string, @Param('blockId') blockId: string) {
    return this.ronService.removeTask(req.user.sub, lessonId, blockId);
  }

  @Post('tasks/:id/answer')
  submitAnswer(@Request() req, @Param('id') id: string, @Body() body: { selected?: string[] }) {
    return this.ronService.submitAnswer(req.user.sub, id, body.selected || []);
  }
}
