import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Пагинация опциональна: без ?skip/?take возвращаем всех (обратная совместимость)
  @Roles('ADMIN', 'CURATOR')
  @Get()
  findAll(@Request() req, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.userService.findAll(
      skip !== undefined ? Number(skip) : undefined,
      take !== undefined ? Number(take) : undefined,
      req.user.sub,
      req.user.role,
    );
  }

  @Roles('ADMIN', 'CURATOR')
  @Get('students')
  findAllStudents(@Request() req) {
    return this.userService.findAllStudents(req.user.sub, req.user.role);
  }

  @Roles('ADMIN', 'CURATOR')
  @Get('curators')
  findAllCurators(@Request() req) {
    return this.userService.findAllCurators(req.user.sub, req.user.role);
  }

  @Roles('ADMIN', 'CURATOR')
  @Get('teachers')
  findAllTeachers() {
    return this.userService.findAllTeachers();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: { email: string; password: string; name?: string; surname?: string; role?: any }) {
    return this.userService.createUser(dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.userService.updateUser(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
