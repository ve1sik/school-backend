import { Body, Controller, Get, Post, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { CourseService } from './course.service';
import { AuthGuard } from '@nestjs/passport'; 
import { RolesGuard } from '../auth/roles.guard'; 
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  @Get()
  async getAll() {
    return this.courseService.getAllCourses();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.CURATOR)
  @Post()
  async createCourse(@Body() dto: any) {
    return this.courseService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.CURATOR)
  @Post(':courseId/themes')
  async createTheme(
    @Param('courseId') courseId: string,
    @Body() body: any 
  ) {
    return { message: 'Тема создана (заглушка)', courseId, body };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.CURATOR)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.courseService.updateCourse(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.CURATOR)
  @Delete(':id')
  async deleteCourse(@Param('id') id: string) {
    return this.courseService.delete(id); 
  }
}