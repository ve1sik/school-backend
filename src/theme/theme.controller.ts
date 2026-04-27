import { Controller, Post, Body, Delete, Param, Patch } from '@nestjs/common';
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

  // Скрытие/Показ темы (глазик)
  @Patch(':id')
  updateVisibility(@Param('id') id: string, @Body('is_visible') is_visible: boolean) {
    return this.themeService.updateVisibility(id, is_visible);
  }
}