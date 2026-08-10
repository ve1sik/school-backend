import { resolveUploadUrl } from '../lib/api';
import { design } from '../lib/designTokens';
import { isVideoUrl } from '../lib/videoEmbed';
import { TheoryVideoGrid } from './TheoryVideoPlayer';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import type { CourseLessonNavItem } from './RussianHomeworkLayout';

export type TheoryUiVariant = 'history' | 'russian';

const ACCENTS: Record<TheoryUiVariant, string> = {
  history: design.historyOrange,
  russian: design.brandPurple,
};

/** Figma Group 133: 156×26 download CTA */
const BTN =
  'inline-flex items-center justify-center gap-1.5 h-[26px] min-w-[156px] px-3 rounded-[6px] text-white text-[10px] font-bold uppercase tracking-[0.04em] transition-colors hover:bg-black leading-none whitespace-nowrap';

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
  /** When practice opens homework (ДЗ) — show note in dropdown / pill */
  practiceIsHomework?: boolean;
  variant?: TheoryUiVariant;
  courseTitleFallback?: string;
  courseNav?: {
    onBackToModules: () => void;
    lessons: CourseLessonNavItem[];
    activeLessonId: string | number;
    onSelectLesson: (id: string | number) => void;
  };
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
  practiceIsHomework = false,
  variant = 'history',
  courseTitleFallback,
  courseNav,
}: ShellProps) {
  const accent = ACCENTS[variant];
  const [menuOpen, setMenuOpen] = useState(false);
  const [lessonMenuOpen, setLessonMenuOpen] = useState(false);
  const partMenuRef = useRef<HTMLDivElement>(null);
  const lessonMenuRef = useRef<HTMLDivElement>(null);
  const label =
    activePart === 'theory'
      ? 'Теория + практика'
      : practiceIsHomework
        ? 'Практика · ДЗ'
        : 'Практика';
  const fallback =
    courseTitleFallback || (variant === 'russian' ? 'Русский язык ЕГЭ' : 'История ЕГЭ');
  const menuHover = variant === 'russian' ? 'hover:bg-violet-50' : 'hover:bg-orange-50';

  useEffect(() => {
    if (!menuOpen && !lessonMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuOpen && partMenuRef.current && !partMenuRef.current.contains(t)) {
        setMenuOpen(false);
      }
      if (lessonMenuOpen && lessonMenuRef.current && !lessonMenuRef.current.contains(t)) {
        setLessonMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen, lessonMenuOpen]);

  const lessonIdx = useMemo(() => {
    if (!courseNav?.lessons?.length) return -1;
    return courseNav.lessons.findIndex((l) => String(l.id) === String(courseNav.activeLessonId));
  }, [courseNav]);

  const activeLessonMeta = lessonIdx >= 0 ? courseNav!.lessons[lessonIdx] : null;

  const goLesson = (dir: -1 | 1) => {
    if (!courseNav || lessonIdx < 0) return;
    const next = courseNav.lessons[lessonIdx + dir];
    if (next) {
      courseNav.onSelectLesson(next.id);
      setLessonMenuOpen(false);
    }
  };

  return (
    <div className="w-full h-full min-h-0 max-w-[829px] mx-auto flex flex-col gap-3 md:gap-4 overflow-hidden px-0 font-[Golos_Text,system-ui,sans-serif]">
      <div
        className="bg-white rounded-[16px] px-4 md:px-5 py-3 flex flex-col gap-2.5 shadow-sm shrink-0 border"
        style={{ borderColor: design.border }}
      >
        {courseNav && (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
            <button
              type="button"
              onClick={courseNav.onBackToModules}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              К модулям
            </button>

            {courseNav.lessons.length > 1 && (
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => goLesson(-1)}
                  disabled={lessonIdx <= 0}
                  className="w-8 h-8 shrink-0 rounded-[8px] border flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:pointer-events-none bg-white"
                  style={{ borderColor: design.border }}
                  aria-label="Предыдущий урок"
                  title="Предыдущий урок"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                </button>

                <div className="relative min-w-0" ref={lessonMenuRef}>
                  <button
                    type="button"
                    onClick={() => setLessonMenuOpen((v) => !v)}
                    className="max-w-[min(100vw-10rem,320px)] sm:max-w-[360px] inline-flex items-center gap-2 px-3 py-2 rounded-[10px] border text-left transition-colors bg-white hover:bg-gray-50"
                    style={{ borderColor: design.border }}
                    aria-expanded={lessonMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <span
                      className="min-w-0 truncate text-[12px] font-semibold"
                      style={{ color: design.textPrimary }}
                    >
                      {activeLessonMeta ? activeLessonMeta.themeTitle : themeTitle}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 shrink-0 tabular-nums">
                      {lessonIdx >= 0 ? `${lessonIdx + 1}/${courseNav.lessons.length}` : ''}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${lessonMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {lessonMenuOpen && (
                    <div
                      className="absolute right-0 top-[calc(100%+6px)] z-40 w-[min(100vw-2rem,360px)] max-h-[min(50vh,320px)] overflow-y-auto custom-scrollbar rounded-[12px] border bg-white shadow-lg py-1.5"
                      style={{ borderColor: design.border }}
                      role="listbox"
                    >
                      {courseNav.lessons.map((item, i) => {
                        const active = String(item.id) === String(courseNav.activeLessonId);
                        return (
                          <button
                            key={String(item.id)}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              courseNav.onSelectLesson(item.id);
                              setLessonMenuOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 transition-colors ${
                              active ? 'text-white' : 'hover:bg-gray-50'
                            }`}
                            style={
                              active
                                ? { backgroundColor: accent }
                                : { color: design.textPrimary }
                            }
                          >
                            <span
                              className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                                active ? 'text-white/80' : 'text-gray-400'
                              }`}
                            >
                              Модуль {item.moduleIndex}
                              {item.title && item.title !== item.themeTitle ? ` · Урок ${i + 1}` : ''}
                            </span>
                            <span className="block text-[13px] font-semibold leading-snug line-clamp-2">
                              {item.themeTitle}
                              {item.title && item.title !== item.themeTitle ? (
                                <span className={active ? 'text-white/90' : 'text-gray-500'}>
                                  {' — '}
                                  {item.title}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => goLesson(1)}
                  disabled={lessonIdx < 0 || lessonIdx >= courseNav.lessons.length - 1}
                  className="w-8 h-8 shrink-0 rounded-[8px] border flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:pointer-events-none bg-white"
                  style={{ borderColor: design.border }}
                  aria-label="Следующий урок"
                  title="Следующий урок"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <span className="min-w-0 truncate text-sm font-bold" style={{ color: design.ink }}>
            {courseTitle || fallback}. Модуль {moduleIndex}
          </span>

          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <span
              className="truncate text-sm font-semibold max-w-[min(100%,280px)] sm:max-w-[360px]"
              style={{ color: design.textPrimary }}
            >
              {themeTitle}
            </span>
            <div className="relative shrink-0" ref={partMenuRef}>
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
                <div
                  className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg z-30 overflow-hidden"
                  style={{ borderColor: design.border }}
                >
                  <button
                    type="button"
                    className={`w-full text-left px-4 py-3 text-sm font-bold ${menuHover}`}
                    style={{ color: design.ink }}
                    onClick={() => {
                      onPartChange('theory');
                      setMenuOpen(false);
                    }}
                  >
                    Теория + практика
                  </button>
                  {hasPractice && (
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 ${menuHover} border-t`}
                      style={{ color: design.ink, borderColor: design.borderLight }}
                      onClick={() => {
                        onPartChange('practice');
                        setMenuOpen(false);
                      }}
                    >
                      <span className="block text-sm font-bold">Практика</span>
                      {practiceIsHomework && (
                        <span className="block text-[11px] font-semibold text-gray-400 mt-0.5">
                          Домашнее задание
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activePart === 'theory' ? theoryContent : practiceContent}
      </div>
    </div>
  );
}

/** @deprecated use SubjectLessonShell */
export const HistoryLessonShell = (props: ShellProps) => (
  <SubjectLessonShell {...props} variant={props.variant || 'history'} />
);

function getFullUrl(url: string) {
  return resolveUploadUrl(url);
}

function normalizeHtml(html?: string) {
  if (!html) return '';
  return html
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br/><br/>')
    .trim();
}

function RichText({ html }: { html?: string }) {
  const cleaned = normalizeHtml(html);
  if (!cleaned) return null;
  return (
    <div className="theory-read-only text-[14px] md:text-[15px] leading-relaxed text-gray-700 [&_.ql-editor_p]:!mb-2">
      <ReactQuill theme="snow" value={cleaned} readOnly modules={{ toolbar: false }} />
    </div>
  );
}

/** Figma textbook cover ≈ 202×288 — scales with viewport, keeps ratio */
function Cover({ src, title, variant }: { src?: string; title?: string; variant: TheoryUiVariant }) {
  const size = 'w-[clamp(148px,24.5vw,202px)] h-[clamp(211px,35vw,288px)] shrink-0';
  if (!src) {
    const placeholder =
      variant === 'russian'
        ? 'bg-gradient-to-br from-violet-50 to-indigo-100 border-violet-100 text-violet-800/80'
        : 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-100 text-orange-800/80';
    return (
      <div
        className={`${size} rounded-[9px] border flex items-center justify-center p-3 text-center ${placeholder}`}
      >
        <span className="text-xs font-extrabold uppercase leading-snug">{title || 'Материал'}</span>
      </div>
    );
  }
  return (
    <img
      src={getFullUrl(src)}
      alt={title || ''}
      className={`${size} object-cover rounded-[9px] border shadow-sm bg-white`}
      style={{ borderColor: design.border }}
    />
  );
}

function DownloadButtons({ section }: { section: ResourceSection }) {
  const items = section.items.filter((item) => item.url);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i, arr) => (
        <a
          key={item.id}
          href={getFullUrl(item.url!)}
          target="_blank"
          rel="noopener noreferrer"
          download
          className={BTN}
          style={{ backgroundColor: '#0E1829' }}
        >
          {item.buttonText || downloadLabel(section.kind, item.title, i, arr.length)}
          <Download className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
        </a>
      ))}
    </div>
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
  const t = (title || '').toLowerCase();
  if (kind === 'script') {
    if (/незаполн|пуст|blank|empty|без\s*ответ/.test(t)) return 'Скачать скрипт (незаполненный)';
    if (/заполн|готов|filled|с\s*ответ/.test(t)) return 'Скачать скрипт (заполненный)';
    return total > 1 ? `Скачать скрипт ${index + 1}` : 'Скачать скрипт';
  }
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
    // Link pasted as video URL → same Figma player
    if ((block.type === 'link' || block.type === 'button') && isVideoUrl(block.url || '')) {
      videos.push({ ...block, type: 'video' });
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
      // One cover per file: prefer block.image, else take next pending image (do NOT wipe the queue)
      const cover = block.image || block.cover || pendingImages.shift();
      pushSection(kind, {
        id: block.id,
        title: block.title || 'Файл',
        url: block.url,
        image: cover,
        content: block.content,
        buttonText: block.buttonText,
      });
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

  const greeting = studentName
    ? `Добрый день, ${studentName}!`
    : 'Добрый день, дорогой ученик!';

  return (
    <div
      className="bg-white rounded-[16px] px-4 md:px-6 py-5 md:py-6 shadow-sm h-full min-h-0 overflow-y-auto space-y-8 border font-[Golos_Text,system-ui,sans-serif] antialiased scrollbar-hide"
      style={{ borderColor: design.border }}
    >
      <div className="space-y-3">
        <h1 className="theory-theme-title text-[28px] font-extrabold leading-[1.05] tracking-tight text-[#0E1829]">
          {themeTitle}
        </h1>
        <p className="font-bold text-[15px] text-[#0E1829]">{greeting}</p>
        {model.intro.length > 0 ? (
          <div className="space-y-3">
            {model.intro.map((b) => (
              <div key={b.id}>
                {b.title && b.title !== 'Текст' && (
                  <h3 className="font-extrabold mb-1.5 text-[#0E1829]">{b.title}</h3>
                )}
                <RichText html={b.content} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] leading-relaxed text-gray-700">
            Каждая тема состоит из двух занятий: теории и практики. Ниже — материалы урока: скрипты,
            учебник, запоминалки и видео. Пожалуйста, ознакомься со всем внимательно!
          </p>
        )}
      </div>

      {model.sections.map((section, sIdx) => {
        const desc = section.description || section.items[0]?.content;
        // Figma: script buttons under text; textbook + memo buttons under covers (156×26)
        const buttonsUnderCover = section.kind === 'textbook' || section.kind === 'memo';

        return (
          <div key={`${section.kind}-${sIdx}`} className="w-full max-w-[778px]">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 md:gap-6 items-start">
              <div className="flex flex-col gap-2.5 shrink-0">
                <div className="flex flex-row flex-wrap gap-3">
                  {section.items.map((item) => (
                    <Cover key={item.id} src={item.image} title={item.title} variant={variant} />
                  ))}
                </div>
                {buttonsUnderCover && <DownloadButtons section={section} />}
              </div>
              <div className="min-w-0 flex-1 max-w-[535px] space-y-2.5 pt-0">
                <h2 className="theory-section-title text-[22px] font-extrabold leading-none text-[#0E1829]">
                  {section.heading}
                </h2>
                {desc ? <RichText html={desc} /> : null}
                {!buttonsUnderCover && <DownloadButtons section={section} />}
              </div>
            </div>
          </div>
        );
      })}

      {model.videos.length > 0 && (
        <div className="w-full pt-1 pb-2">
          <TheoryVideoGrid videos={model.videos} accent={accent} />
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
