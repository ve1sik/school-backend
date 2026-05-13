import { Controller, Post, Body, Delete, Param, Patch, Put } from '@nestjs/common';
import { ThemeService } from './theme.service';

@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Post()
  create(@Body() dto: any) {
    return this.themeService.create(dto);
  }

  // Удаление темы
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.themeService.delete(id);
  }

  // 🔥 ИЗМЕНЕНО: Явно достаем title и is_visible, чтобы NestJS их не обрезал!
  @Patch(':id')
  updatePatch(
    @Param('id') id: string, 
    @Body('title') title?: string,
    @Body('is_visible') is_visible?: boolean
  ) {
    return this.themeService.update(id, { title, is_visible });
  }

  // 🔥 Добавлен PUT (резервный вариант для фронта)
  @Put(':id')
  updatePut(
    @Param('id') id: string, 
    @Body('title') title?: string,
    @Body('is_visible') is_visible?: boolean
  ) {
    return this.themeService.update(id, { title, is_visible });
  }
}