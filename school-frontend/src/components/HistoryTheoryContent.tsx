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
  russian: design.russianPurple,
};

const ACCENT_GRADS: Record<TheoryUiVariant, string> = {
  history: `linear-gradient(90deg, ${design.historyOrangeGradFrom} 0%, ${design.historyOrangeGradTo} 100%)`,
  russian: `linear-gradient(90deg, ${design.russianPurpleGradFrom} 0%, ${design.russianPurpleGradTo} 100%)`,
};

/** Figma Group 133: 156×26 (wide labels ≈183×26), radius 3px, #0E1829 */
const BTN =
  'inline-flex items-center justify-center gap-1 h-[26px] min-w-[156px] px-2 rounded-[3px] text-white text-[10px] font-bold uppercase tracking-[0.02em] transition-colors hover:bg-black/90 leading-none whitespace-nowrap';
const BTN_MOBILE =
  'inline-flex items-center justify-center gap-1.5 w-full md:w-auto md:min-w-[156px] h-10 md:h-[26px] px-3 md:px-2 rounded-[6px] md:rounded-[3px] text-white text-[11px] md:text-[10px] font-bold uppercase tracking-[0.02em] transition-colors hover:bg-black/90 leading-none whitespace-nowrap';

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
  const accentGrad = ACCENT_GRADS[variant];
  const [menuOpen, setMenuOpen] = useState(false);
  const [lessonMenuOpen, setLessonMenuOpen] = useState(false);
  const partMenuRef = useRef<HTMLDivElement>(null);
  const mobileLessonMenuRef = useRef<HTMLDivElement>(null);
  const desktopLessonMenuRef = useRef<HTMLDivElement>(null);
  const label =
    activePart === 'theory'
      ? 'Часть 1. Теория'
      : practiceIsHomework
        ? 'Практика · ДЗ'
        : 'Часть 2. Практика';
  const fallback =
    courseTitleFallback || (variant === 'russian' ? 'Русский язык ЕГЭ' : 'История ЕГЭ');
  const menuHover = variant === 'russian' ? 'hover:bg-violet-50' : 'hover:bg-orange-50';

  useEffect(() => {
    if (!menuOpen && !lessonMenuOpen) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (menuOpen && partMenuRef.current && !partMenuRef.current.contains(t)) {
        setMenuOpen(false);
      }
      if (lessonMenuOpen) {
        const inMobile = mobileLessonMenuRef.current?.contains(t);
        const inDesktop = desktopLessonMenuRef.current?.contains(t);
        if (!inMobile && !inDesktop) {
          setLessonMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
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
      {/* Mobile header — Figma: course card + ТЕОРИЯ / ПРАКТИКА pills */}
      <div
        className={`md:hidden bg-white rounded-[16px] px-4 py-3 flex flex-col gap-3 shadow-sm shrink-0 border ${
          lessonMenuOpen ? 'relative z-50' : ''
        }`}
        style={{ borderColor: design.border }}
      >
        {lessonMenuOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 md:hidden bg-black/20"
            aria-label="Закрыть список уроков"
            onClick={() => setLessonMenuOpen(false)}
          />
        )}
        <div className="relative z-50" ref={mobileLessonMenuRef}>
          <button
            type="button"
            onClick={() => courseNav?.lessons?.length ? setLessonMenuOpen((v) => !v) : undefined}
            className="w-full flex items-start justify-between gap-3 text-left"
            aria-expanded={lessonMenuOpen}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold leading-snug" style={{ color: design.ink }}>
                {courseTitle || fallback}. Модуль {moduleIndex}
              </p>
              <p className="text-[16px] font-semibold mt-0.5 leading-snug" style={{ color: design.textPrimary }}>
                {activeLessonMeta?.title || themeTitle}
              </p>
            </div>
            {courseNav && courseNav.lessons.length > 0 && (
              <ChevronDown
                className={`w-5 h-5 shrink-0 mt-0.5 transition-transform ${lessonMenuOpen ? 'rotate-180' : ''}`}
                style={{ color: accent }}
                strokeWidth={2.5}
              />
            )}
          </button>

          {lessonMenuOpen && courseNav && (
            <div
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[min(50vh,320px)] overflow-y-auto custom-scrollbar rounded-[12px] border bg-white shadow-lg py-1.5"
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
                    style={active ? { backgroundColor: accent } : { color: design.textPrimary }}
                  >
                    <span
                      className={`block text-[12px] font-bold uppercase tracking-wider mb-1 ${
                        active ? 'text-white/80' : 'text-gray-400'
                      }`}
                    >
                      Модуль {item.moduleIndex}
                      {item.title && item.title !== item.themeTitle ? ` · Урок ${i + 1}` : ''}
                    </span>
                    <span className="block text-[15px] font-semibold leading-snug line-clamp-2">
                      {item.title || item.themeTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="flex rounded-full p-1 gap-1 overflow-x-auto custom-scrollbar flex-nowrap"
          style={{ backgroundColor: `${accent}18` }}
        >
          <button
            type="button"
            onClick={() => onPartChange('theory')}
            className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide transition-colors shrink-0 font-[Merriweather_Sans,Golos_Text,sans-serif]"
            style={{
              background: activePart === 'theory' ? accentGrad : 'transparent',
              color: activePart === 'theory' ? 'white' : accent,
            }}
          >
            Теория
          </button>
          {hasPractice && (
            <button
              type="button"
              onClick={() => onPartChange('practice')}
              className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide transition-colors shrink-0 font-[Merriweather_Sans,Golos_Text,sans-serif]"
              style={{
                background: activePart === 'practice' ? accentGrad : 'transparent',
                color: activePart === 'practice' ? 'white' : accent,
              }}
            >
              Практика
            </button>
          )}
        </div>
      </div>

      {/* Desktop header */}
      <div
        className="hidden md:flex bg-white rounded-[16px] px-5 py-3 flex-col gap-2.5 shadow-sm shrink-0 border"
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

                <div className="relative min-w-0" ref={desktopLessonMenuRef}>
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
                      {activeLessonMeta ? activeLessonMeta.title : themeTitle}
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
                              className={`block text-[12px] font-bold uppercase tracking-wider mb-1 ${
                                active ? 'text-white/80' : 'text-gray-400'
                              }`}
                            >
                              Модуль {item.moduleIndex}
                              {item.title && item.title !== item.themeTitle ? ` · Урок ${i + 1}` : ''}
                            </span>
                            <span className="block text-[15px] font-semibold leading-snug line-clamp-2">
                              {item.title || item.themeTitle}
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
          <span
            className="min-w-0 truncate text-sm font-extrabold font-[Merriweather_Sans,Golos_Text,sans-serif]"
            style={{ color: design.ink }}
          >
            {courseTitle || fallback}. Модуль {moduleIndex}
          </span>

          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <span
              className="truncate text-[16px] font-normal leading-normal tracking-tight max-w-[min(100%,280px)] sm:max-w-[360px] font-[Merriweather_Sans,Golos_Text,sans-serif]"
              style={{ color: design.ink }}
            >
              {themeTitle}
            </span>
            <div className="relative shrink-0" ref={partMenuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center justify-center gap-1.5 h-[23px] min-w-[149px] px-3 rounded-[23px] text-[10px] font-extrabold uppercase tracking-wide text-white leading-none font-[Merriweather_Sans,Golos_Text,sans-serif]"
                style={{ background: accentGrad }}
              >
                {label}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
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
                    Теория
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
                      <span className="block text-sm font-bold">Часть 2. Практика</span>
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
    <div className="theory-read-only theory-body-text">
      <ReactQuill theme="snow" value={cleaned} readOnly modules={{ toolbar: false }} />
    </div>
  );
}

/** Figma cover: 202×288 desktop; mobile script — два в ряд */
function Cover({
  src,
  title,
  variant,
  compact,
}: {
  src?: string;
  title?: string;
  variant: TheoryUiVariant;
  compact?: boolean;
}) {
  const size = compact
    ? 'w-[calc(50%-6px)] min-w-[130px] max-w-[160px] h-auto aspect-[202/288] shrink-0'
    : 'w-[clamp(148px,24.5vw,202px)] h-[clamp(211px,35vw,288px)] max-w-[202px] max-h-[288px] shrink-0';
  const radius = 'rounded-[4.34px]';
  if (!src) {
    const placeholder =
      variant === 'russian'
        ? 'bg-gradient-to-br from-violet-50 to-indigo-100 border-violet-100 text-violet-800/80'
        : 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-100 text-orange-800/80';
    return (
      <div
        className={`${size} ${radius} border flex items-center justify-center p-3 text-center ${placeholder}`}
      >
        <span className="text-[10px] font-extrabold uppercase leading-snug">{title || 'Материал'}</span>
      </div>
    );
  }
  return (
    <img
      src={getFullUrl(src)}
      alt={title || ''}
      className={`${size} ${radius} object-cover border bg-white`}
      style={{ borderColor: design.border }}
    />
  );
}

function DownloadButtons({
  section,
  underCover = false,
  align = 'left',
}: {
  section: ResourceSection;
  underCover?: boolean;
  align?: 'left' | 'right';
}) {
  const items = section.items.filter((item) => item.url);
  if (!items.length) return null;
  const alignClass =
    align === 'right' ? 'justify-end md:justify-end' : 'justify-start md:justify-start';
  return (
    <div
      className={`flex flex-col md:flex-row flex-wrap gap-2 w-full ${alignClass} ${
        underCover ? 'md:w-[202px] md:max-w-full' : ''
      }`}
    >
      {items.map((item, i, arr) => {
        const label = item.buttonText || downloadLabel(section.kind, item.title, i, arr.length);
        const wide = label.length > 18;
        return (
          <a
            key={item.id}
            href={getFullUrl(item.url!)}
            target="_blank"
            rel="noopener noreferrer"
            download
            className={`${BTN_MOBILE}${wide ? ' md:min-w-[183px]' : ''}${underCover ? ' md:max-w-[202px]' : ''}`}
            style={{ backgroundColor: '#0E1829' }}
          >
            {label}
            <Download className="w-3.5 h-3.5 md:w-3 md:h-3 shrink-0" strokeWidth={2.5} />
          </a>
        );
      })}
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

function kindFromSignals(title: string, buttonText?: string, hint?: string | null): ResourceSection['kind'] {
  const t = `${title || ''} ${buttonText || ''} ${hint || ''}`.toLowerCase();
  if (/скрипт|конспект|outline/.test(t)) return 'script';
  if (/учебник|textbook/.test(t)) return 'textbook';
  if (/запоминал|мнемон|memo/.test(t)) return 'memo';
  return 'other';
}

function kindFromTitle(title: string) {
  return kindFromSignals(title);
}

function headingFor(kind: ResourceSection['kind'], fallback: string) {
  if (kind === 'script') return 'Скрипт';
  if (kind === 'textbook') return 'Учебник';
  if (kind === 'memo') return 'Запоминалки';
  return fallback || 'Материал';
}

/** Figma: кнопка под обложкой — одиночный файл (учебник, теория…); под текстом — скрипт (2+) и запоминалки */
function sectionButtonsUnderCover(section: ResourceSection): boolean {
  if (section.kind === 'memo') return false;
  if (section.kind === 'script' || section.items.length > 1) return false;
  return section.items.some((i) => i.url);
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
  let pendingHeading: string | null = null;

  const pushSection = (kind: ResourceSection['kind'], item: ResourceItem) => {
    const resolvedKind = kind !== 'other' ? kind : kindFromSignals(item.title, item.buttonText, pendingHeading);
    const last = sections[sections.length - 1];
    if (last && last.kind === resolvedKind && resolvedKind !== 'other') {
      last.items.push(item);
      if (!last.description && pendingTexts.length) {
        last.description = pendingTexts.join('');
        pendingTexts = [];
      }
      pendingHeading = null;
      return;
    }
    const heading =
      resolvedKind !== 'other'
        ? headingFor(resolvedKind, item.title)
        : pendingHeading || item.title;
    sections.push({
      kind: resolvedKind,
      heading,
      description: pendingTexts.length ? pendingTexts.join('') : item.content,
      items: [item],
    });
    pendingTexts = [];
    pendingHeading = null;
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
        if (block.title && block.title !== 'Текст') {
          pendingHeading = block.title;
        }
        pendingTexts.push(block.content || '');
      }
      if (block.image || block.url) pendingImages.push(block.image || block.url);
      continue;
    }
    if (block.type === 'file' || block.type === 'link' || block.type === 'button') {
      const kind =
        block.resourceKind ||
        kindFromSignals(block.title || '', block.buttonText, pendingHeading);
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
      className="bg-white rounded-[16px] px-4 md:px-5 py-5 md:py-6 shadow-sm h-full min-h-0 overflow-y-auto space-y-7 border font-[Merriweather_Sans,Golos_Text,system-ui,sans-serif] antialiased scrollbar-hide"
      style={{ borderColor: design.border }}
    >
      <div className="w-full max-w-[778px] space-y-2">
        <h1 className="theory-theme-title hidden md:block">{themeTitle}</h1>
        <p className="theory-greeting">{greeting}</p>
        {model.intro.length > 0 ? (
          <div className="space-y-2 theory-body-text">
            {model.intro.map((b) => (
              <div key={b.id}>
                {b.title && b.title !== 'Текст' && (
                  <h3 className="theory-section-title mb-1">{b.title}</h3>
                )}
                <RichText html={b.content} />
              </div>
            ))}
          </div>
        ) : (
          <p className="theory-body-text">
            Каждая тема состоит из двух занятий: теории и практики. Ниже — материалы урока: скрипты,
            учебник, запоминалки и видео. Пожалуйста, ознакомься со всем внимательно!
          </p>
        )}
      </div>

      {model.sections.map((section, sIdx) => {
        const desc = section.description || section.items[0]?.content;
        const buttonsUnderCover = sectionButtonsUnderCover(section);
        const buttonAlign: 'left' | 'right' =
          section.kind === 'memo' || section.kind === 'script' ? 'right' : 'left';
        const hasCovers = section.items.some((item) => item.image);
        const isScript = section.kind === 'script';

        return (
          <div key={`${section.kind}-${sIdx}`} className="w-full max-w-[778px]">
            {/* Mobile — Figma: колонка, кнопки под обложкой / справа под текстом */}
            <div className="md:hidden space-y-3">
              {hasCovers && (
                <div className={`flex flex-row flex-wrap ${isScript ? 'gap-3' : 'gap-0'}`}>
                  {section.items.map((item) => (
                    <Cover
                      key={item.id}
                      src={item.image}
                      title={item.title}
                      variant={variant}
                      compact={isScript && section.items.length > 1}
                    />
                  ))}
                </div>
              )}
              {buttonsUnderCover && (
                <DownloadButtons section={section} underCover align="left" />
              )}
              <h2 className="theory-section-title">{section.heading}</h2>
              {desc ? <RichText html={desc} /> : null}
              {!buttonsUnderCover && (
                <DownloadButtons section={section} align={buttonAlign} />
              )}
            </div>

            {/* Desktop — обложка слева, текст справа */}
            <div className="hidden md:flex flex-row gap-[27px] items-start">
              <div
                className={`flex flex-col shrink-0 max-w-full ${
                  isScript ? 'w-auto gap-2' : 'w-[202px] gap-2'
                }`}
              >
                <div className={`flex flex-row flex-wrap ${isScript ? 'gap-3' : 'gap-0'}`}>
                  {section.items.map((item) => (
                    <Cover
                      key={item.id}
                      src={item.image}
                      title={item.title}
                      variant={variant}
                      compact={isScript && section.items.length > 1}
                    />
                  ))}
                </div>
                {buttonsUnderCover && (
                  <DownloadButtons section={section} underCover align="left" />
                )}
              </div>
              <div className="min-w-0 flex-1 max-w-[542px] space-y-2 pt-0">
                <h2 className="theory-section-title">{section.heading}</h2>
                {desc ? <RichText html={desc} /> : null}
                {!buttonsUnderCover && (
                  <DownloadButtons section={section} align={buttonAlign} />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {model.videos.length > 0 && (
        <div className="w-full max-w-[778px] pt-0.5 pb-1">
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
