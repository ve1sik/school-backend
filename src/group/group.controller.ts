import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { GroupService } from './group.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Roles('ADMIN')
  @Post()
  create(@Body() createGroupDto: { title: string }) {
    return this.groupService.create(createGroupDto);
  }

  @Roles('ADMIN', 'CURATOR')
  @Get()
  findAll() {
    return this.groupService.findAll();
  }

  @Roles('ADMIN', 'CURATOR')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: { title?: string; curator_id?: string }) {
    return this.groupService.update(id, updateGroupDto);
  }

  @Roles('ADMIN')
  @Post(':id/students')
  setStudents(@Param('id') id: string, @Body('studentIds') studentIds: string[]) {
    return this.groupService.setStudents(id, studentIds);
  }

  @Roles('ADMIN')
  @Post(':id/courses')
  setCourses(@Param('id') id: string, @Body('courseIds') courseIds: string[]) {
    return this.groupService.setCourses(id, courseIds);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupService.remove(id);
  }
}