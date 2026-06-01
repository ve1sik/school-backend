import { Body, Controller, Get, Post, Patch, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { CourseService } from './course.service';
import { AuthGuard } from '@nestjs/passport'; 
import { RolesGuard } from '../auth/roles.guard'; 
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  // Учитывает, КТО запрашивает курсы (студент видит только свои)
  @Get()
  async getAll(@Request() req: any) {
    return this.courseService.getAllCourses(req.user.sub, req.user.role);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Post()
  async createCourse(@Body() dto: any) {
    return this.courseService.create(dto);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.courseService.updateCourse(id, dto);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Delete(':id')
  async deleteCourse(@Param('id') id: string) {
    return this.courseService.delete(id); 
  }
}