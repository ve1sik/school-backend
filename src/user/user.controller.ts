import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles('ADMIN', 'CURATOR')
  @Get('students')
  findAllStudents() {
    return this.userService.findAllStudents();
  }

  // 🔥 НОВЫЙ МАРШРУТ
  @Roles('ADMIN')
  @Get('curators')
  findAllCurators() {
    return this.userService.findAllCurators();
  }
}