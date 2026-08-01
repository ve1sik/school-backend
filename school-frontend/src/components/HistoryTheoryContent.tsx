import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Download, Play } from 'lucide-react';
import ReactQuill from 'react-quill-new';

export type TheoryUiVariant = 'history' | 'russian';

const ACCENTS: Record<TheoryUiVariant, string> = {
  history: '#EF6C35',
  russian: '#6C63FF',
};

const BTN =
  'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1A1D26] hover:bg-black text-white text-[11px] font-black uppercase tracking-wide transition-colors';

type Part = 'theory' | 'practice';

type ShellProps = {
  courseTitle: string;
  moduleIndex: number;
  themeTitle: string;
  activePart: Part;
  onPartChange: (part: Part) => void;
  theoryContent: ReactNode;
  practiceContent: ReactNode;
  hasPractice: boolean;
  variant?: TheoryUiVariant;
  courseTitleFallback?: string;
};

/** Top bar + Теория/Практика dropdown (PDF p.8 history / p.9 russian). */
export function SubjectLessonShell({
  courseTitle,
  moduleIndex,
  themeTitle,
  activePart,
  onPartChange,
  theoryContent,
  practiceContent,
  hasPractice,
  variant = 'history',
  courseTitleFallback,
}: ShellProps) {
  const accent = ACCENTS[variant];
  const [menuOpen, setMenuOpen] = useState(false);
  const label = activePart === 'theory' ? 'Теория + практика' : 'Практика';
  const fallback =
    courseTitleFallback || (variant === 'russian' ? 'Русский язык ЕГЭ' : 'История ЕГЭ');
  const menuHover = variant === 'russian' ? 'hover:bg-violet-50' : 'hover:bg-orange-50';

  return (
    <div className="w-full max-w-[1100px] mx-auto px-2 md:px-4 pb-10 pt-2 space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl px-4 md:px-5 py-3 flex flex-wrap items-center gap-3 justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-2 md:gap-4 min-w-0 text-sm font-bold text-gray-800">
          <span className="truncate">
            {courseTitle || fallback}. Модуль {moduleIndex}
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span className="truncate text-gray-700 font-semibold">{themeTitle}</span>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wide text-white"
            style={{ backgroundColor: accent }}
          >
            {label}
            <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
              <button
                type="button"
                className={`w-full text-left px-4 py-3 text-sm font-bold ${menuHover} text-gray-800`}
                onClick={() => {
                  onPartChange('theory');
                  setMenuOpen(false);
                }}
              >
                Теория
              </button>
              {hasPractice && (
                <button
                  type="button"
                  className={`w-full text-left px-4 py-3 text-sm font-bold ${menuHover} text-gray-800 border-t border-gray-100`}
                  onClick={() => {
                    onPartChange('practice');
                    setMenuOpen(false);
                  }}
                >
                  Практика
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {activePart === 'theory' ? theoryContent : practiceContent}
    </div>
  );
}

/** @deprecated use SubjectLessonShell */
export const HistoryLessonShell = (props: ShellProps) => (
  <SubjectLessonShell {...props} variant={props.variant || 'history'} />
);

function getFullUrl(url: string) {
  if (!url) return '';
  let finalUrl = url;
  if (finalUrl.startsWith('http://prepodmgy.ru')) finalUrl = finalUrl.replace('http://', 'https://');
  if (finalUrl.startsWith('http')) return finalUrl;
  const clean = finalUrl.startsWith('/') ? finalUrl.slice(1) : finalUrl;
  if (clean.startsWith('uploads/')) return `https://prepodmgy.ru/${clean}`;
  return `https://prepodmgy.ru/api/${clean}`;
}

function getEmbedUrl(url: string) {
  if (!url) return '';
  if (url.includes('vk.com/video_ext.php')) return url;
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
  return url;
}

function RichText({ html }: { html?: string }) {
  if (!html) return null;
  return (
    <div className="theory-read-only text-[15px] leading-relaxed text-gray-700">
      <ReactQuill theme="snow" value={html} readOnly modules={{ toolbar: false }} />
    </div>
  );
}

function Cover({ src, title, variant }: { src?: string; title?: string; variant: TheoryUiVariant }) {
  if (!src) {
    const placeholder =
      variant === 'russian'
        ? 'bg-gradient-to-br from-violet-50 to-indigo-100 border-violet-100 text-violet-800/80'
        : 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-100 text-orange-800/80';
    return (
      <div
        className={`w-[140px] sm:w-[160px] aspect-[3/4] rounded-xl border flex items-center justify-center p-3 text-center ${placeholder}`}
      >
        <span className="text-xs font-black uppercase leading-snug">{title || 'Материал'}</span>
      </div>
    );
  }
  return (
    <img
      src={getFullUrl(src)}
      alt={title || ''}
      className="w-[140px] sm:w-[160px] aspect-[3/4] object-cover rounded-xl border border-gray-200 shadow-sm bg-white"
    />
  );
}

type ResourceItem = {
  id: string;
  title: string;
  url?: string;
  image?: string;
  content?: string;
  buttonText?: string;
};

type ResourceSection = {
  kind: 'script' | 'textbook' | 'memo' | 'other';
  heading: string;
  description?: string;
  items: ResourceItem[];
};

function kindFromTitle(title: string): ResourceSection['kind'] {
  const t = (title || '').toLowerCase();
  if (/скрипт|конспект|outline/.test(t)) return 'script';
  if (/учебник/.test(t)) return 'textbook';
  if (/запоминал|мнемон/.test(t)) return 'memo';
  return 'other';
}

function headingFor(kind: ResourceSection['kind'], fallback: string) {
  if (kind === 'script') return 'Скрипт';
  if (kind === 'textbook') return 'Учебник';
  if (kind === 'memo') return 'Запоминалки';
  return fallback || 'Материал';
}

function downloadLabel(kind: ResourceSection['kind'], title: string, index: number, total: number) {
  if (kind === 'script') return total > 1 ? `Скачать скрипт ${index + 1}` : 'Скачать скрипт';
  if (kind === 'textbook') return 'Скачать учебник';
  if (kind === 'memo') return 'Скачать запоминалку';
  return title || 'Скачать';
}

/** Group theory blocks into intro + resource sections + videos. */
export function buildSubjectTheoryModel(blocks: any[]) {
  const intro: any[] = [];
  const videos: any[] = [];
  const sections: ResourceSection[] = [];
  let pendingImages: string[] = [];
  let pendingTexts: string[] = [];

  const pushSection = (kind: ResourceSection['kind'], item: ResourceItem) => {
    const last = sections[sections.length - 1];
    if (last && last.kind === kind && kind !== 'other') {
      last.items.push(item);
      if (!last.description && pendingTexts.length) {
        last.description = pendingTexts.join('');
        pendingTexts = [];
      }
      return;
    }
    sections.push({
      kind,
      heading: headingFor(kind, item.title),
      description: pendingTexts.length ? pendingTexts.join('') : item.content,
      items: [item],
    });
    pendingTexts = [];
  };

  for (const block of blocks) {
    if (block.type === 'video' || block.type === 'video_file') {
      videos.push(block);
      continue;
    }
    if (block.type === 'image' || block.type === 'img') {
      const src = block.url || block.image;
      if (src) pendingImages.push(src);
      continue;
    }
    if (block.type === 'text' || block.type === 'paragraph') {
      if (sections.length === 0 && videos.length === 0) {
        intro.push(block);
      } else {
        pendingTexts.push(block.content || '');
      }
      if (block.image || block.url) pendingImages.push(block.image || block.url);
      continue;
    }
    if (block.type === 'file' || block.type === 'link' || block.type === 'button') {
      const kind = kindFromTitle(block.title || '');
      const cover = block.image || pendingImages.shift();
      pushSection(kind, {
        id: block.id,
        title: block.title || 'Файл',
        url: block.url,
        image: cover,
        content: block.content,
        buttonText: block.buttonText,
      });
      pendingImages = [];
      continue;
    }
  }

  if (pendingImages.length) {
    sections.push({
      kind: 'other',
      heading: 'Материалы',
      items: pendingImages.map((img, i) => ({
        id: `img-${i}`,
        title: 'Изображение',
        image: img,
      })),
    });
  }

  return { intro, sections, videos };
}

export const buildHistoryTheoryModel = buildSubjectTheoryModel;

type TheoryProps = {
  themeTitle: string;
  blocks: any[];
  studentName?: string;
  variant?: TheoryUiVariant;
};

export function SubjectTheoryContent({
  themeTitle,
  blocks,
  studentName,
  variant = 'history',
}: TheoryProps) {
  const accent = ACCENTS[variant];
  const model = useMemo(() => buildSubjectTheoryModel(blocks), [blocks]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const greeting = studentName
    ? `Добрый день, ${studentName}!`
    : 'Добрый день, дорогой ученик!';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-8 shadow-sm space-y-10">
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight pb-3 border-b border-gray-100">
          {themeTitle}
        </h1>
        <p className="font-bold text-gray-900">{greeting}</p>
        {model.intro.length > 0 ? (
          <div className="space-y-3">
            {model.intro.map((b) => (
              <div key={b.id}>
                {b.title && b.title !== 'Текст' && (
                  <h3 className="font-black text-gray-900 mb-1">{b.title}</h3>
                )}
                <RichText html={b.content} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed text-gray-700">
            Каждая тема состоит из двух занятий: теории и практики. Ниже — материалы урока: скрипты,
            учебник, запоминалки и видео. Пожалуйста, ознакомься со всем внимательно!
          </p>
        )}
      </div>

      {model.sections.map((section, sIdx) => (
        <div key={`${section.kind}-${sIdx}`} className="space-y-4 pt-2 border-t border-gray-100">
          <div className="flex flex-col md:flex-row gap-5 md:gap-8 items-start">
            <div className="flex flex-wrap gap-3 shrink-0">
              {section.items.map((item) => (
                <Cover key={item.id} src={item.image} title={item.title} variant={variant} />
              ))}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <h2 className="text-xl font-black text-gray-900">{section.heading}</h2>
              {section.description ? (
                <RichText html={section.description} />
              ) : section.items[0]?.content ? (
                <RichText html={section.items[0].content} />
              ) : null}

              <div className="flex flex-wrap gap-3 pt-1">
                {section.items
                  .filter((item) => item.url)
                  .map((item, i, arr) => (
                    <a
                      key={item.id}
                      href={getFullUrl(item.url!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className={BTN}
                    >
                      <Download className="w-4 h-4" />
                      {item.buttonText || downloadLabel(section.kind, item.title, i, arr.length)}
                    </a>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {model.videos.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          {model.videos.map((v) => {
            const isDirect =
              /\.(mp4|mov|webm)$/i.test(v.url || '') || String(v.url || '').includes('uploads/');
            const src = isDirect || v.type === 'video_file' ? getFullUrl(v.url) : getEmbedUrl(v.url);
            const playing = activeVideo === v.id;

            return (
              <div key={v.id} className="space-y-2">
                {v.title && <h3 className="font-black text-gray-900">{v.title}</h3>}
                {playing ? (
                  isDirect || v.type === 'video_file' ? (
                    <video
                      src={src}
                      controls
                      autoPlay
                      playsInline
                      className="w-full max-h-[70vh] rounded-2xl bg-black"
                    />
                  ) : (
                    <div className="aspect-video rounded-2xl overflow-hidden bg-gray-900 relative">
                      <iframe
                        src={src}
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                        allow="autoplay; fullscreen; picture-in-picture"
                        title={v.title || 'Видео'}
                      />
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveVideo(v.id)}
                    className="w-full aspect-video md:aspect-[21/9] rounded-2xl bg-[#ECEFF5] hover:bg-[#E4E8F0] transition-colors flex items-center justify-center relative overflow-hidden border border-gray-100"
                  >
                    <span
                      className="w-16 h-16 rounded-full border-[3px] flex items-center justify-center bg-white/80 shadow-sm"
                      style={{ borderColor: accent }}
                    >
                      <Play className="w-7 h-7 fill-current ml-1" style={{ color: accent }} />
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {blocks.length === 0 && (
        <p className="text-gray-500 font-medium">В этом уроке пока нет теоретических материалов.</p>
      )}
    </div>
  );
}

export default function HistoryTheoryContent(props: TheoryProps) {
  return <SubjectTheoryContent {...props} variant={props.variant || 'history'} />;
}
