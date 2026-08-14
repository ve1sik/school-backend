import { api, resolveUploadUrl } from './api';
import {
  extractVideoUrl,
  getDirectVideoThumbnail,
  isDirectVideoFile,
  needsPlaybackResolve,
  resolveVideoEmbed,
  type VideoEmbedResult,
} from './videoEmbed';

export type VideoPrefetch = {
  thumbnail: string | null;
  kind: 'iframe' | 'video' | 'external';
  playUrl: string;
  fallbackUrl: string;
  provider?: string;
};

const inflight = new Map<string, Promise<VideoPrefetch>>();
const ready = new Map<string, VideoPrefetch>();

function cacheKey(raw: string) {
  return extractVideoUrl(raw) || raw.trim();
}

function localPrefetch(raw: string, resolved: VideoEmbedResult, direct: boolean): VideoPrefetch | null {
  if (direct) {
    const playUrl = resolveUploadUrl(raw);
    return {
      thumbnail: null,
      kind: 'video',
      playUrl,
      fallbackUrl: playUrl,
      provider: 'file',
    };
  }

  if (!needsPlaybackResolve(raw) && resolved.embedUrl) {
    return {
      thumbnail: resolved.thumbnailUrl || getDirectVideoThumbnail(raw),
      kind: resolved.kind,
      playUrl: resolved.embedUrl,
      fallbackUrl: resolved.fallbackUrl,
      provider: resolved.provider,
    };
  }

  return null;
}

/** Prefetch thumbnail + playback; dedupe + in-memory cache. */
export function prefetchVideo(raw: string, resolved: VideoEmbedResult, direct: boolean): Promise<VideoPrefetch> {
  const key = cacheKey(raw);
  if (!key) return Promise.resolve({ thumbnail: null, kind: 'external', playUrl: '', fallbackUrl: '' });

  const cached = ready.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const local = localPrefetch(raw, resolved, direct);
  if (local && !needsPlaybackResolve(raw)) {
    ready.set(key, local);
    return Promise.resolve(local);
  }

  const task = (async (): Promise<VideoPrefetch> => {
    const source = extractVideoUrl(raw);
    const thumbDirect = resolved.thumbnailUrl || getDirectVideoThumbnail(raw);

    if (local && !needsPlaybackResolve(raw)) {
      ready.set(key, local);
      return local;
    }

    try {
      const res = await api.get<VideoPrefetch>('/video/prefetch', { params: { url: source } });
      const data: VideoPrefetch = {
        thumbnail: res.data.thumbnail || thumbDirect,
        kind: res.data.kind,
        playUrl: res.data.playUrl,
        fallbackUrl: res.data.fallbackUrl,
        provider: res.data.provider,
      };
      ready.set(key, data);
      return data;
    } catch {
      const fallback: VideoPrefetch = local || {
        thumbnail: thumbDirect,
        kind: resolved.kind,
        playUrl: resolved.embedUrl,
        fallbackUrl: resolved.fallbackUrl,
        provider: resolved.provider,
      };
      ready.set(key, fallback);
      return fallback;
    }
  })();

  inflight.set(key, task);
  void task.finally(() => inflight.delete(key));
  return task;
}

/** Prefetch all videos on a lesson page in parallel. */
export function prefetchVideoBatch(
  items: { url: string; type?: string }[],
): void {
  for (const item of items) {
    const raw = item.url?.trim();
    if (!raw) continue;
    const direct = isDirectVideoFile(raw) || item.type === 'video_file';
    const resolved = direct
      ? {
          embedUrl: resolveUploadUrl(raw),
          fallbackUrl: resolveUploadUrl(raw),
          kind: 'video' as const,
          provider: 'file',
        }
      : resolveVideoEmbed(raw);
    void prefetchVideo(raw, resolved, direct);
  }
}
