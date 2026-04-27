import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { LessonService } from './lesson.service';

@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  create(@Body() dto: any) {
    return this.lessonService.create(dto);
  }

  @Get('theme/:themeId')
  getByTheme(@Param('themeId') themeId: string) {
    return this.lessonService.getByTheme(themeId);
  }

  // 🔥 ИСПРАВЛЕНО: Теперь контроллер понимает, когда мы сохраняем весь урок
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    // Если прислали только глазик (is_visible), обновляем только его
    if (Object.keys(dto).length === 1 && 'is_visible' in dto) {
      return this.lessonService.updateVisibility(id, dto.is_visible);
    }
    // Во всех остальных случаях (кнопка "Сохранить изменения") — сохраняем всё, включая попытки!
    return this.lessonService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.lessonService.delete(id);
  }
}