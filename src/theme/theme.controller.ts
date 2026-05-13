import { Controller, Post, Body, Delete, Param, Patch, Put } from '@nestjs/common';
import { ThemeService } from './theme.service';

@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Post()
  create(@Body() dto: any) {
    return this.themeService.create(dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.themeService.delete(id);
  }

  // 🔥 Вытаскиваем title напрямую, чтобы NestJS его не игнорировал
  @Patch(':id')
  updatePatch(
    @Param('id') id: string, 
    @Body('title') title: string,
    @Body('is_visible') is_visible: boolean
  ) {
    return this.themeService.update(id, { title, is_visible });
  }

  @Put(':id')
  updatePut(
    @Param('id') id: string, 
    @Body('title') title: string,
    @Body('is_visible') is_visible: boolean
  ) {
    return this.themeService.update(id, { title, is_visible });
  }
}