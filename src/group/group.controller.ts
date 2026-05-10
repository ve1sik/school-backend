import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { GroupService } from './group.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Roles('ADMIN')
  @Post()
  create(@Body() createGroupDto: any) {
    return this.groupService.create(createGroupDto);
  }

  @Roles('ADMIN', 'CURATOR')
  @Get()
  findAll() {
    return this.groupService.findAll();
  }

  // 🔥 МАРШРУТ МАГАЗИНА ЗДЕСЬ
  @Roles('ADMIN', 'CURATOR', 'STUDENT')
  @Get('shop')
  findShopGroups() {
    return this.groupService.findShopGroups();
  }

  @Roles('ADMIN', 'CURATOR')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: any) {
    return this.groupService.update(id, updateGroupDto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupService.remove(id);
  }

  @Roles('ADMIN')
  @Post(':id/courses')
  updateCourses(@Param('id') id: string, @Body() body: { courseIds: string[] }) {
    return this.groupService.updateCourses(id, body.courseIds);
  }

  @Roles('ADMIN')
  @Post(':id/students')
  updateStudents(@Param('id') id: string, @Body() body: { studentIds: string[] }) {
    return this.groupService.updateStudents(id, body.studentIds);
  }
}