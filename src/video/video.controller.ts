import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VideoService } from './video.service';

@UseGuards(AuthGuard('jwt'))
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  /** Preview image for external video hosts (VK, Yandex Disk, Rutube…). */
  @Get('thumbnail')
  async thumbnail(@Query('url') url: string) {
    const thumbnail = await this.videoService.resolveThumbnail(url || '');
    return { thumbnail };
  }

  /** Thumbnail + playback одним запросом (быстрее для клиента). */
  @Get('prefetch')
  async prefetch(@Query('url') url: string) {
    return this.videoService.prefetch(url || '');
  }

  /** Playable URL: VK embed с hash, Яндекс — прямая ссылка на mp4, и т.д. */
  @Get('resolve')
  async resolve(@Query('url') url: string) {
    return this.videoService.resolvePlayback(url || '');
  }
}
