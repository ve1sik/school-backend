import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ScheduleService } from './schedule.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // Расписание видят все авторизованные пользователи
  @Get()
  getAllEvents() {
    return this.scheduleService.getEvents();
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Post()
  createEvent(@Body() body: any) {
    return this.scheduleService.createEvent(body);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Delete(':id')
  deleteEvent(@Param('id') id: string) {
    return this.scheduleService.deleteEvent(id);
  }
}
