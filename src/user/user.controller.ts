import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Roles('ADMIN', 'CURATOR')
  @Get('students')
  findAllStudents() {
    return this.userService.findAllStudents();
  }

  @Roles('ADMIN')
  @Get('curators')
  findAllCurators() {
    return this.userService.findAllCurators();
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
