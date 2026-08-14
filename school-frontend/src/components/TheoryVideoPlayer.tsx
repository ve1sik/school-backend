import { ExternalLink, Loader2, Maximize2, Minimize2, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveUploadUrl } from '../lib/api';
import { getDirectVideoThumbnail, isDirectVideoFile, resolveVideoEmbed } from '../lib/videoEmbed';
import { prefetchVideo, prefetchVideoBatch, prefetchVideoThumbnail, type VideoPrefetch } from '../lib/videoPrefetch';

function useVideoPrefetch(url: string, direct: boolean) {
  const resolved = useMemo(
    () =>
      direct
        ? {
            embedUrl: resolveUploadUrl(url),
            fallbackUrl: resolveUploadUrl(url),
            kind: 'video' as const,
            provider: 'file',
          }
        : resolveVideoEmbed(url),
    [url, direct],
  );

  const [prefetch, setPrefetch] = useState<VideoPrefetch | null>(null);
  const [loading, setLoading] = useState(true);
  const [earlyThumb, setEarlyThumb] = useState<string | null>(() => getDirectVideoThumbnail(url));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPrefetch(null);
    setEarlyThumb(getDirectVideoThumbnail(url));

    void prefetchVideoThumbnail(url).then((thumb) => {
      if (!cancelled && thumb) setEarlyThumb(thumb);
    });

    void prefetchVideo(url, resolved, direct).then((data) => {
      if (!cancelled) {
        setPrefetch(data);
        setLoading(false);
        if (data.thumbnail) setEarlyThumb(data.thumbnail);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url, direct, resolved]);

  return { prefetch, loading, resolved, earlyThumb };
}

type Size = 'large' | 'half';

type Props = {
  url: string;
  title?: string;
  accent?: string;
  size?: Size;
  type?: string;
};

export function TheoryVideoTile({
  url,
  title,
  accent = '#6C63FF',
  size = 'large',
  type,
}: Props) {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const direct = isDirectVideoFile(url) || type === 'video_file';
  const { prefetch, loading, resolved, earlyThumb } = useVideoPrefetch(url, direct);

  useEffect(() => {
    setActive(false);
    setFailed(false);
    setThumbFailed(false);
    setIsFullscreen(false);
  }, [url]);

  useEffect(() => {
    if (!active) return;

    const syncFullscreen = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(
        document.fullscreenElement === shellRef.current ||
          doc.webkitFullscreenElement === shellRef.current,
      );
    };

    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, [active]);

  useEffect(() => {
    if (!active || prefetch?.kind !== 'video') return;
    const v = videoRef.current;
    if (!v) return;
    void v.play().catch(() => {});
  }, [active, prefetch?.playUrl, prefetch?.kind]);

  const box =
    size === 'large'
      ? 'w-full aspect-[778/408] rounded-[8.97px]'
      : 'w-full aspect-[381/200] rounded-[8.97px]';

  const fallbackUrl = prefetch?.fallbackUrl || resolved.fallbackUrl || url;
  const canEmbed =
    !!prefetch?.playUrl && prefetch.kind !== 'external' && !failed;

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = shellRef.current;
    if (!el) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const fsEl = document.fullscreenElement || doc.webkitFullscreenElement;

    if (fsEl === el) {
      if (document.exitFullscreen) void document.exitFullscreen();
      else doc.webkitExitFullscreen?.();
      return;
    }

    const target = el as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    if (target.requestFullscreen) void target.requestFullscreen();
    else target.webkitRequestFullscreen?.();
  };

  const activate = () => {
    if (loading) return;
    if (!canEmbed) {
      setFailed(true);
      setActive(true);
      return;
    }
    setActive(true);
  };

  if (!url?.trim()) {
    return (
      <div className={`${box} bg-[#F5F7FF] flex items-center justify-center`}>
        <span
          className="w-12 h-12 md:w-14 md:h-14 rounded-full border-[2.5px] flex items-center justify-center bg-white/90"
          style={{ borderColor: accent }}
        >
          <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-0.5" style={{ color: accent }} />
        </span>
      </div>
    );
  }

  if (active && failed) {
    return (
      <div className={`${box} bg-[#F5F7FF] flex flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-sm font-semibold text-gray-700 max-w-md">
          {resolved.provider === 'yandex-disk'
            ? 'Не удалось воспроизвести с Яндекс.Диска на сайте. Убедитесь, что ссылка публичная.'
            : resolved.provider === 'vk'
              ? 'VK не отдал embed-код. Вставьте «Код для вставки» из VK Видео.'
              : 'Это видео нельзя встроить — откройте по ссылке.'}
        </p>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-bold"
          style={{ backgroundColor: accent }}
        >
          <ExternalLink className="w-4 h-4" />
          Открыть видео
        </a>
      </div>
    );
  }

  const thumbnail = earlyThumb || prefetch?.thumbnail;
  const showPoster = !active && !!thumbnail && !thumbFailed;
  const showSpinner = loading && !canEmbed && !showPoster;

  return (
    <div
      ref={shellRef}
      className={`${box} relative overflow-hidden bg-black group [&:fullscreen]:aspect-auto [&:fullscreen]:w-full [&:fullscreen]:h-full [&:fullscreen]:max-w-none [&:fullscreen]:rounded-none`}
    >
      {/* Warmup: плеер грузится до нажатия Play */}
      {canEmbed && prefetch!.kind === 'video' && (
        <video
          ref={videoRef}
          src={prefetch!.playUrl}
          controls={active}
          playsInline
          preload="auto"
          className={`absolute inset-0 w-full h-full object-contain bg-black ${
            active ? 'z-[1]' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}
      {canEmbed && prefetch!.kind === 'iframe' && (
        <iframe
          src={prefetch!.playUrl}
          className={`absolute inset-0 w-full h-full border-0 ${
            active ? 'z-[1]' : 'opacity-0 pointer-events-none'
          }`}
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          referrerPolicy="no-referrer-when-downgrade"
          title={title || 'Видео'}
        />
      )}

      {!active && (
        <button
          type="button"
          onClick={activate}
          disabled={loading && !canEmbed}
          className="absolute inset-0 z-[2] flex items-center justify-center bg-[#F5F7FF] hover:bg-[#EEF1FA] transition-colors disabled:cursor-wait"
          aria-label={title ? `Смотреть: ${title}` : 'Смотреть видео'}
        >
          {showPoster && (
            <img
              src={thumbnail!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
              referrerPolicy="no-referrer"
              onError={() => setThumbFailed(true)}
            />
          )}
          <span className="absolute inset-0 bg-black/15 hover:bg-black/25 transition-colors" aria-hidden />
          {showSpinner ? (
            <Loader2 className="relative z-[1] w-8 h-8 animate-spin" style={{ color: accent }} />
          ) : (
            <span
              className="relative z-[1] w-12 h-12 md:w-14 md:h-14 rounded-full border-[2.5px] flex items-center justify-center bg-white/90 shadow-sm"
              style={{ borderColor: accent }}
            >
              <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-0.5" style={{ color: accent }} />
            </span>
          )}
        </button>
      )}

      {active && canEmbed && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute bottom-2.5 right-2.5 z-20 inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-black/70 hover:bg-black/85 text-white shadow-lg transition-colors"
          aria-label={isFullscreen ? 'Свернуть' : 'На весь экран'}
          title={isFullscreen ? 'Свернуть' : 'На весь экран'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 shrink-0" /> : <Maximize2 className="w-4 h-4 shrink-0" />}
          <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:inline">
            {isFullscreen ? 'Свернуть' : 'На весь экран'}
          </span>
        </button>
      )}
    </div>
  );
}

type GridProps = {
  videos: { id: string; url?: string; title?: string; type?: string }[];
  accent?: string;
};

export function TheoryVideoGrid({ videos, accent = '#6C63FF' }: GridProps) {
  const vids = videos.filter((v) => v.url?.trim());

  useEffect(() => {
    prefetchVideoBatch(
      videos
        .filter((v) => v.url?.trim())
        .map((v) => ({ url: v.url!, type: v.type })),
    );
  }, [videos]);

  if (!vids.length) return null;

  if (vids.length === 1) {
    return (
      <div className="w-full max-w-[778px]">
        <TheoryVideoTile url={vids[0].url!} title={vids[0].title} accent={accent} size="large" type={vids[0].type} />
      </div>
    );
  }

  if (vids.length === 2) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[778px]">
        {vids.map((v) => (
          <TheoryVideoTile key={v.id} url={v.url!} title={v.title} accent={accent} size="half" type={v.type} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-[778px]">
      <TheoryVideoTile url={vids[0].url!} title={vids[0].title} accent={accent} size="large" type={vids[0].type} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vids.slice(1, 3).map((v) => (
          <TheoryVideoTile key={v.id} url={v.url!} title={v.title} accent={accent} size="half" type={v.type} />
        ))}
      </div>
      {vids.length > 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vids.slice(3).map((v) => (
            <TheoryVideoTile key={v.id} url={v.url!} title={v.title} accent={accent} size="half" type={v.type} />
          ))}
        </div>
      )}
    </div>
  );
}
