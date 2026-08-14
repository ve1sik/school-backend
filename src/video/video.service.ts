import { Injectable, Logger } from '@nestjs/common';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export type PlaybackResult = {
  kind: 'iframe' | 'video' | 'external';
  playUrl: string;
  fallbackUrl: string;
  provider?: string;
};

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly cache = new Map<string, { expires: number; value: unknown }>();
  private readonly cacheTtlMs = 60 * 60 * 1000;

  private cacheGet<T>(key: string): T | null {
    const hit = this.cache.get(key);
    if (!hit || hit.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return hit.value as T;
  }

  private cacheSet(key: string, value: unknown) {
    this.cache.set(key, { expires: Date.now() + this.cacheTtlMs, value });
  }

  /** Thumbnail + playback одним запросом (быстрее для клиента). */
  async prefetch(rawUrl: string): Promise<{ thumbnail: string | null } & PlaybackResult> {
    const url = rawUrl?.trim();
    const key = `prefetch:${url.toLowerCase()}`;
    const cached = this.cacheGet<{ thumbnail: string | null } & PlaybackResult>(key);
    if (cached) return cached;

    const [thumbnail, playback] = await Promise.all([
      this.resolveThumbnail(url),
      this.resolvePlayback(url),
    ]);
    const result = { thumbnail, ...playback };
    this.cacheSet(key, result);
    return result;
  }

  async resolvePlayback(rawUrl: string): Promise<PlaybackResult> {
    const url = rawUrl?.trim();
    if (!url) {
      return { kind: 'external', playUrl: '', fallbackUrl: '' };
    }
    const key = `play:${url.toLowerCase()}`;
    const cached = this.cacheGet<PlaybackResult>(key);
    if (cached) return cached;

    const result = await this.resolvePlaybackUncached(url);
    this.cacheSet(key, result);
    return result;
  }

  private async resolvePlaybackUncached(url: string): Promise<PlaybackResult> {
    if (!url) {
      return { kind: 'external', playUrl: '', fallbackUrl: '' };
    }

    const lower = url.toLowerCase();

    // VK — нужен hash из embed-кода или со страницы видео
    const vk =
      url.match(/vk\.com\/video(-?\d+)_(\d+)/) ||
      url.match(/vkvideo\.ru\/video(-?\d+)_(\d+)/) ||
      url.match(/(?:vk\.com|vkvideo\.ru)\/video_ext\.php\?[^#]*\boid=(-?\d+)[^#]*\bid=(\d+)/);
    if (vk || lower.includes('video_ext.php')) {
      const vkPlay = await this.vkPlaybackUrl(url, vk?.[1], vk?.[2]);
      if (vkPlay) {
        return {
          kind: 'iframe',
          playUrl: vkPlay,
          fallbackUrl: vk?.[1] ? `https://vk.com/video${vk[1]}_${vk[2]}` : url,
          provider: 'vk',
        };
      }
    }

    // Яндекс.Диск — прямая ссылка на файл → HTML5 video на сайте
    if (lower.includes('disk.yandex') || lower.includes('yadi.sk')) {
      const direct = await this.yandexDirectUrl(url);
      const fallback = url.startsWith('http') ? url : `https://${url.replace(/^\/\//, '')}`;
      if (direct) {
        return { kind: 'video', playUrl: direct, fallbackUrl: fallback, provider: 'yandex-disk' };
      }
      return { kind: 'external', playUrl: fallback, fallbackUrl: fallback, provider: 'yandex-disk' };
    }

    // Google Drive — iframe preview (fullscreen через браузер на контейнере)
    const gDrive =
      url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (gDrive) {
      const embed = `https://drive.google.com/file/d/${gDrive[1]}/preview`;
      const fallback = `https://drive.google.com/file/d/${gDrive[1]}/view`;
      return { kind: 'iframe', playUrl: embed, fallbackUrl: fallback, provider: 'google-drive' };
    }

    // YouTube / Rutube / Vimeo — клиент резолвит сам, но подстрахуем
    const yt =
      url.match(/[?&]v=([\w-]{6,})/) ||
      url.match(/youtu\.be\/([\w-]{6,})/) ||
      url.match(/youtube\.com\/(?:embed|shorts)\/([\w-]{6,})/);
    if (yt) {
      const embed = `https://www.youtube.com/embed/${yt[1]}?rel=0`;
      return { kind: 'iframe', playUrl: embed, fallbackUrl: url, provider: 'youtube' };
    }

    const rt = url.match(/rutube\.ru\/(?:video|embed)\/([a-f0-9-]+)/i);
    if (rt) {
      return {
        kind: 'iframe',
        playUrl: `https://rutube.ru/play/embed/${rt[1]}`,
        fallbackUrl: url,
        provider: 'rutube',
      };
    }

    if (lower.includes('player.vimeo.com') || lower.includes('vimeo.com')) {
      const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vm) {
        return {
          kind: 'iframe',
          playUrl: `https://player.vimeo.com/video/${vm[1]}`,
          fallbackUrl: url,
          provider: 'vimeo',
        };
      }
    }

    if (/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(url)) {
      return { kind: 'video', playUrl: url, fallbackUrl: url, provider: 'file' };
    }

    return { kind: 'iframe', playUrl: url, fallbackUrl: url };
  }

  async resolveThumbnail(rawUrl: string): Promise<string | null> {
    const url = rawUrl?.trim();
    if (!url) return null;

    const lower = url.toLowerCase();

    const yt =
      url.match(/[?&]v=([\w-]{6,})/) ||
      url.match(/youtu\.be\/([\w-]{6,})/) ||
      url.match(/youtube\.com\/shorts\/([\w-]{6,})/) ||
      url.match(/youtube\.com\/embed\/([\w-]{6,})/);
    if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;

    const gDrive =
      url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (gDrive) return `https://drive.google.com/thumbnail?id=${gDrive[1]}&sz=w1280`;

    if (lower.includes('disk.yandex') || lower.includes('yadi.sk')) {
      const yandex = await this.yandexDiskPreview(url);
      if (yandex) return yandex;
    }

    const vk =
      url.match(/vk\.com\/video(-?\d+)_(\d+)/) ||
      url.match(/vkvideo\.ru\/video(-?\d+)_(\d+)/) ||
      url.match(/vk\.com\/video_ext\.php\?[^#]*\boid=(-?\d+)[^#]*\bid=(\d+)/) ||
      url.match(/vkvideo\.ru\/video_ext\.php\?[^#]*\boid=(-?\d+)[^#]*\bid=(\d+)/);
    if (vk) {
      const vkThumb = await this.vkPreview(vk[1], vk[2]);
      if (vkThumb) return vkThumb;
    }

    const rutube = url.match(/rutube\.ru\/(?:video|embed)\/([a-f0-9-]+)/i);
    if (rutube) {
      const rtThumb = await this.rutubePreview(rutube[1]);
      if (rtThumb) return rtThumb;
    }

    if (lower.includes('vimeo.com')) {
      const vm = await this.vimeoPreview(url);
      if (vm) return vm;
    }

    return this.ogImageFromPage(url);
  }

  private async yandexDiskPreview(publicUrl: string): Promise<string | null> {
    try {
      const api = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(publicUrl)}&preview_size=XL`;
      const res = await fetch(api, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) return null;
      const data = (await res.json()) as { preview?: string; file?: string };
      if (data.preview) return data.preview;
      if (typeof data.file === 'string' && /\.(mp4|mov|webm|m3u8)/i.test(data.file)) {
        return null;
      }
    } catch (e) {
      this.logger.debug(`Yandex preview failed: ${(e as Error).message}`);
    }
    return this.ogImageFromPage(publicUrl);
  }

  /** VK: сохраняем hash из embed-кода или вытаскиваем со страницы видео. */
  private async vkPlaybackUrl(rawUrl: string, oid?: string, id?: string): Promise<string | null> {
    try {
      const hashInUrl = rawUrl.match(/[?&]hash=([a-f0-9]+)/i)?.[1];
      const oidVal =
        oid ||
        rawUrl.match(/[?&]oid=(-?\d+)/i)?.[1];
      const idVal =
        id ||
        rawUrl.match(/[?&]id=(\d+)/i)?.[1];

      if (oidVal && idVal && hashInUrl) {
        return `https://vk.com/video_ext.php?oid=${oidVal}&id=${idVal}&hash=${hashInUrl}&hd=2`;
      }

      if (!oidVal || !idVal) return null;

      const pageUrl = `https://vk.com/video${oidVal}_${idVal}`;
      const html = await this.fetchHtml(pageUrl);
      if (!html) return null;

      const embedMatch = html.match(
        /video_ext\.php\?oid=(-?\d+)&id=(\d+)&hash=([a-f0-9]+)/i,
      );
      if (embedMatch) {
        return `https://vk.com/video_ext.php?oid=${embedMatch[1]}&id=${embedMatch[2]}&hash=${embedMatch[3]}&hd=2`;
      }

      const hashOnly = html.match(/"hash"\s*:\s*"([a-f0-9]{8,})"/i)?.[1];
      if (hashOnly) {
        return `https://vk.com/video_ext.php?oid=${oidVal}&id=${idVal}&hash=${hashOnly}&hd=2`;
      }

      // Без hash VK часто показывает «видео недоступно» — только ссылка наружу
      return null;
    } catch (e) {
      this.logger.debug(`VK playback resolve failed: ${(e as Error).message}`);
      return null;
    }
  }

  /** Прямая ссылка на видеофайл с публичного Яндекс.Диска. */
  private async yandexDirectUrl(publicUrl: string): Promise<string | null> {
    try {
      const downloadApi = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(publicUrl)}`;
      const dlRes = await fetch(downloadApi, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (dlRes.ok) {
        const dl = (await dlRes.json()) as { href?: string };
        if (dl.href) return dl.href;
      }

      const metaApi = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(publicUrl)}`;
      const metaRes = await fetch(metaApi, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!metaRes.ok) return null;
      const meta = (await metaRes.json()) as { file?: string; mime_type?: string };
      if (meta.file && /^video\//.test(meta.mime_type || '')) {
        return meta.file;
      }
    } catch (e) {
      this.logger.debug(`Yandex direct URL failed: ${(e as Error).message}`);
    }
    return null;
  }

  private async vkPreview(oid: string, id: string): Promise<string | null> {
    const pageUrl = `https://vk.com/video${oid}_${id}`;
    return this.ogImageFromPage(pageUrl);
  }

  private async rutubePreview(id: string): Promise<string | null> {
    try {
      const res = await fetch(`https://rutube.ru/api/video/${id}/`, {
        headers: { Accept: 'application/json', 'User-Agent': UA },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { thumbnail_url?: string };
      return data.thumbnail_url || null;
    } catch (e) {
      this.logger.debug(`Rutube preview failed: ${(e as Error).message}`);
      return null;
    }
  }

  private async vimeoPreview(pageUrl: string): Promise<string | null> {
    try {
      const oembed = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(pageUrl)}`;
      const res = await fetch(oembed, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) return null;
      const data = (await res.json()) as { thumbnail_url?: string };
      return data.thumbnail_url || null;
    } catch {
      return null;
    }
  }

  private async ogImageFromPage(pageUrl: string): Promise<string | null> {
    const html = await this.fetchHtml(pageUrl);
    if (!html) return null;
    return this.extractOgImage(html);
  }

  private async fetchHtml(pageUrl: string): Promise<string | null> {
    try {
      const res = await fetch(pageUrl, {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch (e) {
      this.logger.debug(`HTML fetch failed for ${pageUrl}: ${(e as Error).message}`);
      return null;
    }
  }

  private extractOgImage(html: string): string | null {
    const patterns = [
      /property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
      /property=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]*property=["']twitter:image(?::src)?["']/i,
      /rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1].replace(/&amp;/g, '&');
    }
    return null;
  }
}
