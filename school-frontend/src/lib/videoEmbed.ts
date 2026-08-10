/** Normalize external video links to embeddable player URLs. */

export function isDirectVideoFile(url: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return /\.(mp4|mov|webm)(\?|$)/i.test(u) || (u.includes('uploads/') && /\.(mp4|mov|webm)/i.test(u));
}

/** True if URL looks like a watchable video (YouTube / VK / Rutube / file…). */
export function isVideoUrl(url: string): boolean {
  if (!url?.trim()) return false;
  const u = url.trim().toLowerCase();
  if (isDirectVideoFile(u)) return true;
  return (
    u.includes('youtube.com') ||
    u.includes('youtu.be') ||
    u.includes('vk.com/video') ||
    u.includes('vkvideo.ru') ||
    u.includes('rutube.ru') ||
    u.includes('vimeo.com') ||
    u.includes('vk.com/video_ext.php')
  );
}

export function getEmbedUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  if (trimmed.includes('youtube.com/embed/')) return trimmed;
  if (trimmed.includes('vk.com/video_ext.php')) return trimmed;
  if (trimmed.includes('rutube.ru/play/embed/')) return trimmed;
  if (trimmed.includes('player.vimeo.com/video/')) return trimmed;

  const ytWatch = trimmed.match(/[?&]v=([\w-]{6,})/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;

  const ytBe = trimmed.match(/youtu\.be\/([\w-]{6,})/);
  if (ytBe) return `https://www.youtube.com/embed/${ytBe[1]}`;

  const ytShorts = trimmed.match(/youtube\.com\/shorts\/([\w-]{6,})/);
  if (ytShorts) return `https://www.youtube.com/embed/${ytShorts[1]}`;

  const vk =
    trimmed.match(/vk\.com\/video(-?\d+)_(\d+)/) ||
    trimmed.match(/vkvideo\.ru\/video(-?\d+)_(\d+)/);
  if (vk) {
    return `https://vk.com/video_ext.php?oid=${vk[1]}&id=${vk[2]}&hd=2`;
  }

  const rt = trimmed.match(/rutube\.ru\/(?:video|embed)\/([a-f0-9]+)/i);
  if (rt) return `https://rutube.ru/play/embed/${rt[1]}`;

  const vm = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;

  return trimmed;
}
