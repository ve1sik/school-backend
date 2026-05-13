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

  // 🔥 ИЗМЕНЕНО: Универсальное обновление (меняет и title, и is_visible)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.themeService.update(id, data);
  }
}