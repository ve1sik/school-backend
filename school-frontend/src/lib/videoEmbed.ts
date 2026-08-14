/** Normalize external video links to embeddable player URLs. */

export function isDirectVideoFile(url: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return /\.(mp4|mov|webm|m3u8)(\?|$)/i.test(u) || (u.includes('uploads/') && /\.(mp4|mov|webm)/i.test(u));
}

/** Extract playable URL from raw admin input (link, iframe HTML, embed code). */
export function extractVideoUrl(raw: string): string {
  if (!raw?.trim()) return '';
  const trimmed = raw.trim();

  const iframeSrc = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeSrc?.[1]) return iframeSrc[1].trim();

  const scriptSrc = trimmed.match(/src:\s*["']([^"']+)["']/i);
  if (scriptSrc?.[1]) return scriptSrc[1].trim();

  const hrefMatch = trimmed.match(/href=["']([^"']+)["']/i);
  if (hrefMatch?.[1] && /video|disk\.yandex|drive\.google|youtube|vk|rutube|vimeo/i.test(hrefMatch[1])) {
    return hrefMatch[1].trim();
  }

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return trimmed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** True if URL looks like a watchable video (YouTube / VK / Rutube / file…). */
export function isVideoUrl(url: string): boolean {
  const extracted = extractVideoUrl(url);
  if (!extracted) return false;
  const u = extracted.toLowerCase();
  if (isDirectVideoFile(u)) return true;
  return (
    u.includes('youtube.com') ||
    u.includes('youtu.be') ||
    u.includes('vk.com/video') ||
    u.includes('vkvideo.ru') ||
    u.includes('rutube.ru') ||
    u.includes('vimeo.com') ||
    u.includes('vk.com/video_ext.php') ||
    u.includes('drive.google.com') ||
    u.includes('disk.yandex') ||
    u.includes('yadi.sk')
  );
}

export type VideoEmbedKind = 'iframe' | 'video' | 'external';

export type VideoEmbedResult = {
  embedUrl: string;
  fallbackUrl: string;
  kind: VideoEmbedKind;
  provider?: string;
};

export function getEmbedUrl(url: string): string {
  return resolveVideoEmbed(url).embedUrl;
}

/** Full embed resolution with fallback for blocked hosts (Yandex Disk, etc.). */
export function resolveVideoEmbed(raw: string): VideoEmbedResult {
  const url = extractVideoUrl(raw);
  if (!url) return { embedUrl: '', fallbackUrl: '', kind: 'external' };

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (isDirectVideoFile(trimmed)) {
    return { embedUrl: trimmed, fallbackUrl: trimmed, kind: 'video', provider: 'file' };
  }

  if (trimmed.includes('youtube.com/embed/')) {
    return { embedUrl: trimmed, fallbackUrl: trimmed, kind: 'iframe', provider: 'youtube' };
  }
  if (trimmed.includes('vk.com/video_ext.php')) {
    return { embedUrl: trimmed, fallbackUrl: trimmed, kind: 'iframe', provider: 'vk' };
  }
  if (trimmed.includes('rutube.ru/play/embed/')) {
    return { embedUrl: trimmed, fallbackUrl: trimmed, kind: 'iframe', provider: 'rutube' };
  }
  if (trimmed.includes('player.vimeo.com/video/')) {
    return { embedUrl: trimmed, fallbackUrl: trimmed, kind: 'iframe', provider: 'vimeo' };
  }

  const ytWatch = trimmed.match(/[?&]v=([\w-]{6,})/);
  if (ytWatch) {
    const embed = `https://www.youtube.com/embed/${ytWatch[1]}`;
    return { embedUrl: embed, fallbackUrl: trimmed, kind: 'iframe', provider: 'youtube' };
  }

  const ytBe = trimmed.match(/youtu\.be\/([\w-]{6,})/);
  if (ytBe) {
    const embed = `https://www.youtube.com/embed/${ytBe[1]}`;
    return { embedUrl: embed, fallbackUrl: trimmed, kind: 'iframe', provider: 'youtube' };
  }

  const ytShorts = trimmed.match(/youtube\.com\/shorts\/([\w-]{6,})/);
  if (ytShorts) {
    const embed = `https://www.youtube.com/embed/${ytShorts[1]}`;
    return { embedUrl: embed, fallbackUrl: trimmed, kind: 'iframe', provider: 'youtube' };
  }

  const vk =
    trimmed.match(/vk\.com\/video(-?\d+)_(\d+)/) ||
    trimmed.match(/vkvideo\.ru\/video(-?\d+)_(\d+)/) ||
    trimmed.match(/vk\.com\/video_ext\.php\?[^#]*\boid=(-?\d+)[^#]*\bid=(\d+)/) ||
    trimmed.match(/vkvideo\.ru\/video_ext\.php\?[^#]*\boid=(-?\d+)[^#]*\bid=(\d+)/);
  if (vk) {
    const embed = `https://vk.com/video_ext.php?oid=${vk[1]}&id=${vk[2]}&hd=2`;
    return { embedUrl: embed, fallbackUrl: trimmed, kind: 'iframe', provider: 'vk' };
  }

  const rt = trimmed.match(/rutube\.ru\/(?:video|embed)\/([a-f0-9-]+)/i);
  if (rt) {
    const embed = `https://rutube.ru/play/embed/${rt[1]}`;
    return { embedUrl: embed, fallbackUrl: trimmed, kind: 'iframe', provider: 'rutube' };
  }

  const vm = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vm) {
    const embed = `https://player.vimeo.com/video/${vm[1]}`;
    return { embedUrl: embed, fallbackUrl: trimmed, kind: 'iframe', provider: 'vimeo' };
  }

  const gDrive =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (gDrive) {
    const embed = `https://drive.google.com/file/d/${gDrive[1]}/preview`;
    const fallback = `https://drive.google.com/file/d/${gDrive[1]}/view`;
    return { embedUrl: embed, fallbackUrl: fallback, kind: 'iframe', provider: 'google-drive' };
  }

  if (lower.includes('disk.yandex') || lower.includes('yadi.sk')) {
    const fallback = trimmed.startsWith('http') ? trimmed : `https://${trimmed.replace(/^\/\//, '')}`;
    return { embedUrl: fallback, fallbackUrl: fallback, kind: 'external', provider: 'yandex-disk' };
  }

  return { embedUrl: trimmed, fallbackUrl: trimmed, kind: 'iframe' };
}
