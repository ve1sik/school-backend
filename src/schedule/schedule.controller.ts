import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ScheduleService } from './schedule.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  getAllEvents(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.scheduleService.getEventsForUser(userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Get('groups')
  getAssignableGroups(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.scheduleService.getAssignableGroups(userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Post()
  createEvent(@Body() body: any) {
    if (body.dates?.length || (body.repeat_weeks && body.repeat_weeks > 1)) {
      return this.scheduleService.createBulkEvents(body);
    }
    return this.scheduleService.createEvent(body);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Patch(':id')
  updateEvent(@Param('id') id: string, @Body() body: any) {
    return this.scheduleService.updateEvent(id, body);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Delete(':id')
  deleteEvent(@Param('id') id: string) {
    return this.scheduleService.deleteEvent(id);
  }
}
