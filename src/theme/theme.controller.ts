import { Controller, Post, Body, Delete, Param, Patch, UseGuards } from '@nestjs/common';
import { ThemeService } from './theme.service';
import { AuthGuard } from '@nestjs/passport'; 
import { RolesGuard } from '../auth/roles.guard'; 
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.CURATOR)
  @Post()
  async createTheme(@Body() dto: any) {
    return this.themeService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.CURATOR)
  @Patch(':id/reorder')
  async reorder(@Param('id') id: string, @Body() dto: { newOrderIndex: number }) {
    return this.themeService.reorder(id, dto.newOrderIndex);
  }

  // 🔥 Точная копия логики из курсов! Принимаем любой dto (включая title)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.CURATOR)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.themeService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.CURATOR)
  @Delete(':id')
  async deleteTheme(@Param('id') id: string) {
    return this.themeService.delete(id);
  }
}