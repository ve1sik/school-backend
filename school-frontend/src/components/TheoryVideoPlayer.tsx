import { ExternalLink, Play } from 'lucide-react';
import { useState } from 'react';
import { resolveUploadUrl } from '../lib/api';
import { isDirectVideoFile, resolveVideoEmbed } from '../lib/videoEmbed';

type Size = 'large' | 'half';

type Props = {
  url: string;
  title?: string;
  /** history orange / russian purple */
  accent?: string;
  size?: Size;
  type?: string;
};

/**
 * Figma lesson video tile: light panel + circular play.
 * 1 → large; 2 → half; 3 → large + 2 half (use TheoryVideoGrid).
 */
export function TheoryVideoTile({
  url,
  title,
  accent = '#6C63FF',
  size = 'large',
  type,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);

  const direct = isDirectVideoFile(url) || type === 'video_file';
  const resolved = direct
    ? { embedUrl: resolveUploadUrl(url), fallbackUrl: resolveUploadUrl(url), kind: 'video' as const, provider: 'file' }
    : resolveVideoEmbed(url);

  const src = resolved.embedUrl;
  const fallbackUrl = resolved.fallbackUrl || url;
  const isExternalOnly = resolved.kind === 'external' || embedFailed;

  const box =
    size === 'large'
      ? 'w-full aspect-[778/408] rounded-[8.97px]'
      : 'w-full aspect-[381/200] rounded-[8.97px]';

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

  if (playing && isExternalOnly) {
    return (
      <div className={`${box} bg-[#F5F7FF] flex flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-sm font-semibold text-gray-700 max-w-md">
          {resolved.provider === 'yandex-disk'
            ? 'Яндекс.Диск не разрешает встроить плеер на сайт. Откройте видео по ссылке.'
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

  if (playing) {
    if (resolved.kind === 'video' || direct) {
      return (
        <video
          src={src}
          controls
          autoPlay
          playsInline
          className={`${box} bg-black object-contain`}
        />
      );
    }
    return (
      <div className={`${box} overflow-hidden bg-gray-900 relative`}>
        <iframe
          src={src}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          referrerPolicy="no-referrer-when-downgrade"
          title={title || 'Видео'}
          onError={() => setEmbedFailed(true)}
        />
        {embedFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#F5F7FF] p-4 text-center">
            <p className="text-sm font-semibold text-gray-700">Не удалось загрузить плеер</p>
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
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`${box} bg-[#F5F7FF] hover:bg-[#EEF1FA] transition-colors flex items-center justify-center relative overflow-hidden`}
      aria-label={title ? `Смотреть: ${title}` : 'Смотреть видео'}
    >
      <span
        className="w-12 h-12 md:w-14 md:h-14 rounded-full border-[2.5px] flex items-center justify-center bg-white/90"
        style={{ borderColor: accent }}
      >
        <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-0.5" style={{ color: accent }} />
      </span>
      {resolved.provider === 'yandex-disk' && (
        <span className="absolute bottom-2 left-2 right-2 text-[10px] font-semibold text-gray-500 bg-white/80 rounded px-2 py-1">
          Яндекс.Диск — откроется в новой вкладке
        </span>
      )}
    </button>
  );
}

type GridProps = {
  videos: { id: string; url?: string; title?: string; type?: string }[];
  accent?: string;
};

/** 1 large / 2 side-by-side / 3 = 1 large + 2 small (Figma p.8–9). */
export function TheoryVideoGrid({ videos, accent = '#6C63FF' }: GridProps) {
  const vids = videos.filter((v) => v.url?.trim());
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
