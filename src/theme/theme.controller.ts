import { Controller, Post, Body, Delete, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { ThemeService } from './theme.service';
import { AuthGuard } from '@nestjs/passport'; 
import { RolesGuard } from '../auth/roles.guard'; 
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Permissions } from '../auth/permissions.decorator';

@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Permissions('MANAGE_COURSES')
  @Post()
  async createTheme(@Body() dto: any, @Request() req) {
    return this.themeService.create(dto, req.user.sub, req.user.role);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Permissions('MANAGE_COURSES')
  @Patch(':id/reorder')
  async reorder(@Param('id') id: string, @Body() dto: { newOrderIndex: number }, @Request() req) {
    return this.themeService.reorder(id, dto.newOrderIndex, req.user.sub, req.user.role);
  }

  // 🔥 Точная копия логики из курсов! Принимаем любой dto (включая title)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Permissions('MANAGE_COURSES')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.themeService.update(id, dto, req.user.sub, req.user.role);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Permissions('MANAGE_COURSES')
  @Delete(':id')
  async deleteTheme(@Param('id') id: string, @Request() req) {
    return this.themeService.delete(id, req.user.sub, req.user.role);
  }
}