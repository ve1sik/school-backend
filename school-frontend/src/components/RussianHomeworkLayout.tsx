import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Menu, Play } from 'lucide-react';
import { design } from '../lib/designTokens';

type Part = 'theory' | 'practice';
export type SubjectUiVariant = 'russian' | 'history';

export type CourseLessonNavItem = {
  id: string | number;
  title: string;
  moduleIndex: number;
  themeTitle: string;
};

type Props = {
  moduleIndex: number;
  themeTitle: string;
  practiceCount: number;
  theoryBlocks: ReactNode;
  practiceSlot: ReactNode;
  activePart: Part;
  onPartChange: (part: Part) => void;
  activePracticeIndex: number;
  onPracticeIndexChange: (index: number) => void;
  passage?: ReactNode | null;
  accent?: string;
  variant?: SubjectUiVariant;
  completedSteps?: boolean[];
  textNavAfter?: number;
  /** Hide T / open-text controls (history mockups) */
  hideTextControls?: boolean;
  /** Optional course navigation (CourseView subject shell) */
  courseNav?: {
    onBackToModules: () => void;
    lessons: CourseLessonNavItem[];
    activeLessonId: string | number;
    onSelectLesson: (id: string | number) => void;
  };
  /** Practice part is homework (ДЗ) — show label on the practice pill */
  practiceIsHomework?: boolean;
};

/** Figma pdf-page-04 — Russian / History subject shell */
export default function RussianHomeworkLayout({
  moduleIndex,
  themeTitle,
  practiceCount,
  theoryBlocks,
  practiceSlot,
  activePart,
  onPartChange,
  activePracticeIndex,
  onPracticeIndexChange,
  passage,
  accent,
  variant = 'russian',
  completedSteps = [],
  textNavAfter,
  hideTextControls,
  courseNav,
  practiceIsHomework = false,
}: Props) {
  const resolvedAccent =
    accent || (variant === 'history' ? design.historyOrange : design.russianPurple);
  const cardStroke = variant === 'russian' ? design.stroke : design.border;
  const navActiveBg =
    variant === 'russian'
      ? `linear-gradient(180deg, ${design.russianPurpleGradFrom} 0%, ${design.russianPurpleGradTo} 100%)`
      : `linear-gradient(180deg, ${design.historyOrangeGradFrom} 0%, ${design.historyOrangeGradTo} 100%)`;
  const partActiveStyle =
    variant === 'russian'
      ? { backgroundColor: resolvedAccent, borderColor: resolvedAccent }
      : { background: navActiveBg, borderColor: 'transparent' };
  const noText = hideTextControls ?? variant === 'history';
  const [textOpen, setTextOpen] = useState(false);
  const [lessonMenuOpen, setLessonMenuOpen] = useState(false);
  const lessonMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lessonMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (lessonMenuRef.current && !lessonMenuRef.current.contains(e.target as Node)) {
        setLessonMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [lessonMenuOpen]);

  const numbers = useMemo(
    () => Array.from({ length: Math.max(practiceCount, 0) }, (_, i) => i),
    [practiceCount],
  );

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

  const scrollNav = (dir: -1 | 1) => {
    if (practiceCount <= 0) return;
    const next = Math.min(practiceCount - 1, Math.max(0, activePracticeIndex + dir));
    onPracticeIndexChange(next);
    onPartChange('practice');
  };

  const navBtn = (i: number) => {
    const active = activePart === 'practice' && i === activePracticeIndex;
    const done = !!completedSteps[i] && !active;
    const nav = design.practiceNav;
    return (
      <button
        key={i}
        type="button"
        onClick={() => {
          onPartChange('practice');
          onPracticeIndexChange(i);
        }}
        className={`shrink-0 flex items-center justify-center font-normal leading-none transition-colors ${
          active
            ? 'text-white'
            : done
              ? 'bg-gray-100 text-gray-500'
              : 'bg-white text-[#0E1829]'
        }`}
        style={{
          width: nav.size,
          height: nav.size,
          borderRadius: nav.radius,
          fontSize: nav.fontSize,
          borderWidth: nav.strokeW,
          borderStyle: 'solid',
          borderColor: active ? 'transparent' : nav.stroke,
          background: active ? navActiveBg : done ? undefined : '#FFFFFF',
        }}
      >
        {i + 1}
      </button>
    );
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-2.5 sm:gap-3.5 overflow-hidden font-[Golos_Text,system-ui,sans-serif]">
      <div
        className="bg-white rounded-[16px] px-3 py-2.5 sm:px-4 sm:py-3.5 md:px-5 md:py-4 space-y-2.5 sm:space-y-3.5 shrink-0"
        style={{ border: `0.5px solid ${cardStroke}` }}
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
                  className="w-8 h-8 shrink-0 rounded-[8px] border border-[#E5E7EB] flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:pointer-events-none bg-white"
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
                    <span className="min-w-0 truncate text-[12px] font-semibold text-[#111827]">
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
                              active ? 'text-white' : 'hover:bg-gray-50 text-[#111827]'
                            }`}
                            style={active ? { backgroundColor: resolvedAccent } : undefined}
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
                  className="w-8 h-8 shrink-0 rounded-[8px] border border-[#E5E7EB] flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:pointer-events-none bg-white"
                  aria-label="Следующий урок"
                  title="Следующий урок"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
          <span
            className="shrink-0 text-[9.5px] font-bold uppercase leading-[1.35] tracking-[0.04em]"
            style={{
              color: variant === 'history' ? design.historyOrange : design.russianPurple,
            }}
          >
            модуль {moduleIndex}
          </span>
          <div
            className="flex items-center gap-1.5 min-w-0 text-[16px] font-semibold"
            style={{ color: design.ink }}
          >
            <BookOpen className="w-4 h-4 shrink-0" style={{ color: design.stroke }} strokeWidth={2} />
            <span className="truncate">{themeTitle}</span>
          </div>
        </div>

        {/* Figma: part pills left, task pagination aligned to end */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onPartChange('theory')}
              className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[12px] sm:text-[13px] font-bold leading-none transition-all border shrink-0 whitespace-nowrap ${
                activePart === 'theory' ? 'text-white' : 'bg-white'
              }`}
              style={
                activePart === 'theory'
                  ? partActiveStyle
                  : { color: resolvedAccent, borderColor: resolvedAccent }
              }
            >
              <span
                className="w-[16px] h-[16px] rounded-full border border-current flex items-center justify-center shrink-0"
                aria-hidden
              >
                <Play className="w-2 h-2 fill-current" />
              </span>
              Часть 1. Теория
            </button>
            <button
              type="button"
              onClick={() => onPartChange('practice')}
              className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[12px] sm:text-[13px] font-bold leading-none transition-all border shrink-0 whitespace-nowrap ${
                activePart === 'practice' ? 'text-white' : 'bg-white'
              }`}
              style={
                activePart === 'practice'
                  ? partActiveStyle
                  : { color: resolvedAccent, borderColor: resolvedAccent }
              }
            >
              <span
                className="w-[16px] h-[16px] rounded-full border border-current flex items-center justify-center shrink-0"
                aria-hidden
              >
                <Play className="w-2 h-2 fill-current" />
              </span>
              Часть 2. Практика
              {practiceIsHomework && (
                <span
                  className={`ml-0.5 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                    activePart === 'practice' ? 'bg-white/20 text-white' : ''
                  }`}
                  style={
                    activePart === 'practice'
                      ? undefined
                      : { color: resolvedAccent, backgroundColor: `${resolvedAccent}18` }
                  }
                >
                  ДЗ
                </span>
              )}
            </button>
          </div>

          {practiceCount > 0 && (
            <div className="flex items-center gap-[3px] overflow-x-auto pb-0.5 custom-scrollbar min-w-0 ml-auto">
              <button
                type="button"
                onClick={() => scrollNav(-1)}
                className="shrink-0 flex items-center justify-center text-white"
                style={{
                  width: design.practiceNav.size,
                  height: design.practiceNav.size,
                  borderRadius: design.practiceNav.radius,
                  background: navActiveBg,
                }}
                aria-label="Предыдущее"
              >
                <ChevronLeft className="w-3 h-3" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => scrollNav(1)}
                className="shrink-0 flex items-center justify-center text-white"
                style={{
                  width: design.practiceNav.size,
                  height: design.practiceNav.size,
                  borderRadius: design.practiceNav.radius,
                  background: navActiveBg,
                }}
                aria-label="Следующее"
              >
                <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
              </button>

              {numbers.map((i) => navBtn(i))}
            </div>
          )}
        </div>
      </div>

      <div
        className="bg-white rounded-[16px] flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{ border: `0.5px solid ${cardStroke}` }}
      >
        <div className="shrink-0 px-3 pt-3 sm:px-5 sm:pt-5 md:px-8 md:pt-7 flex flex-wrap items-start justify-between gap-2.5">
          <h1
            className="hidden md:block text-[clamp(1.05rem,2.2vw,1.75rem)] font-extrabold leading-tight tracking-tight"
            style={{ color: design.ink }}
          >
            {themeTitle}
          </h1>
          {!noText && passage && activePart === 'practice' && (
            <button
              type="button"
              onClick={() => setTextOpen((v) => !v)}
              className="inline-flex items-center gap-2 w-full md:w-auto justify-center px-4 py-2.5 rounded-[10px] hover:bg-black text-white text-[11px] font-bold uppercase tracking-[0.04em]"
              style={{ backgroundColor: design.ink }}
            >
              <Menu className="w-4 h-4" />
              {textOpen ? 'Скрыть текст' : 'Открыть текст'}
            </button>
          )}
        </div>

        {!noText && passage && textOpen && activePart === 'practice' && (
          <div
            className="shrink-0 mx-3 sm:mx-5 md:mx-8 mt-2 mb-1 p-3 md:p-5 rounded-[12px] bg-[#F8FAFC] text-[14px] md:text-[15px] leading-relaxed border max-h-[32vh] overflow-y-auto custom-scrollbar"
            style={{ borderColor: design.border, color: design.textPrimary }}
          >
            {passage}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden px-3 pb-3 sm:px-5 sm:pb-4 md:px-8 md:pb-5 pt-2 md:pt-4">
          {activePart === 'theory' ? (
            <div className="h-full min-h-0 overflow-y-auto custom-scrollbar">{theoryBlocks}</div>
          ) : (
            practiceSlot
          )}
        </div>
      </div>
    </div>
  );
}
