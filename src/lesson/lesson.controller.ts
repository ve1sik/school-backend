import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { LessonService } from './lesson.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Post()
  create(@Body() dto: any, @Request() req) {
    return this.lessonService.create(dto, req.user.sub, req.user.role);
  }

  @Get('theme/:themeId')
  getByTheme(@Param('themeId') themeId: string) {
    return this.lessonService.getByTheme(themeId);
  }

  // 🔥 ФИЧА: Эндпоинт для Drag and Drop (перетаскивание уроков)
  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Patch(':id/reorder')
  reorder(@Param('id') id: string, @Body() dto: { themeId: string; newOrderIndex: number }, @Request() req) {
    return this.lessonService.reorder(id, dto.themeId, dto.newOrderIndex, req.user.sub, req.user.role);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    // Если прислали только глазик (is_visible), обновляем только его
    if (Object.keys(dto).length === 1 && 'is_visible' in dto) {
      return this.lessonService.updateVisibility(id, dto.is_visible, req.user.sub, req.user.role);
    }
    // Во всех остальных случаях — сохраняем всё
    return this.lessonService.update(id, dto, req.user.sub, req.user.role);
  }

  @Roles(Role.ADMIN, Role.CURATOR, Role.TEACHER)
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.lessonService.delete(id, req.user.sub, req.user.role);
  }
}
