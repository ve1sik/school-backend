import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  getAllEvents() {
    return this.scheduleService.getEvents();
  }

  @Post()
  createEvent(@Body() body: any) {
    return this.scheduleService.createEvent(body);
  }

  @Delete(':id')
  deleteEvent(@Param('id') id: string) {
    return this.scheduleService.deleteEvent(id);
  }
}