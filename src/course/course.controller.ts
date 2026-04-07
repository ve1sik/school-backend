import { Body, Controller, Get, Post, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/course.dto';
// import { AuthGuard } from '@nestjs/passport'; // Временно не используем
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';
// import { Role } from '@prisma/client';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  // Получить все курсы (доступно всем)
  @Get()
  async getAll() {
    return this.courseService.getAllCourses();
  }

  // Создать курс
  // Брат, я закомментировал Guards, чтобы тебя пустило без токена и роли админа
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateCourseDto) {
    return this.courseService.createCourse(dto);
  }

  // Обновить курс 
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles(Role.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: CreateCourseDto) {
    return this.courseService.updateCourse(id, dto);
  }

  // Удалить курс
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.courseService.deleteCourse(id);
  }
}