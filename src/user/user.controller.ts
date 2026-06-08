import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../auth/permissions.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Пагинация опциональна: без ?skip/?take возвращаем всех (обратная совместимость)
  @Permissions('MANAGE_USERS')
  @Get()
  findAll(@Request() req, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.userService.findAll(
      skip !== undefined ? Number(skip) : undefined,
      take !== undefined ? Number(take) : undefined,
      req.user.sub,
      req.user.role,
      req.user.admin_permissions || [],
    );
  }

  @Permissions('MANAGE_USERS')
  @Get('students')
  findAllStudents(@Request() req) {
    return this.userService.findAllStudents(req.user.sub, req.user.role, req.user.admin_permissions || []);
  }

  @Permissions('MANAGE_USERS')
  @Get('curators')
  findAllCurators(@Request() req) {
    return this.userService.findAllCurators(req.user.sub, req.user.role, req.user.admin_permissions || []);
  }

  @Permissions('MANAGE_USERS')
  @Get('teachers')
  findAllTeachers() {
    return this.userService.findAllTeachers();
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: { email: string; password: string; name?: string; surname?: string; role?: any }) {
    return this.userService.createUser(dto);
  }

  @Permissions('MANAGE_USERS')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.userService.updateUser(id, dto, req.user.role);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
