import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Menu, Play } from 'lucide-react';

type Part = 'theory' | 'practice';
export type SubjectUiVariant = 'russian' | 'history';

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
};

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
}: Props) {
  const resolvedAccent = accent || (variant === 'history' ? '#EF6C35' : '#6C63FF');
  const noText = hideTextControls ?? variant === 'history';
  const [textOpen, setTextOpen] = useState(false);

  const numbers = useMemo(
    () => Array.from({ length: Math.max(practiceCount, 0) }, (_, i) => i),
    [practiceCount],
  );

  const insertAfterIdx = noText
    ? null
    : typeof textNavAfter === 'number' && textNavAfter > 0
      ? textNavAfter - 1
      : practiceCount >= 23
        ? 21
        : null;

  const scrollNav = (dir: -1 | 1) => {
    if (practiceCount <= 0) return;
    const next = Math.min(practiceCount - 1, Math.max(0, activePracticeIndex + dir));
    onPracticeIndexChange(next);
    onPartChange('practice');
  };

  const navBtn = (i: number) => {
    const active = activePart === 'practice' && i === activePracticeIndex;
    const done = !!completedSteps[i] && !active;
    return (
      <button
        key={i}
        type="button"
        onClick={() => {
          onPartChange('practice');
          onPracticeIndexChange(i);
        }}
        className={`w-8 h-8 shrink-0 rounded-lg text-[12px] font-black border transition-colors ${
          active
            ? 'text-white border-transparent'
            : done
              ? 'bg-gray-200 text-gray-600 border-gray-200'
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
        }`}
        style={active ? { backgroundColor: resolvedAccent } : undefined}
      >
        {i + 1}
      </button>
    );
  };

  const inactivePill = {
    color: resolvedAccent,
    borderColor: resolvedAccent,
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-2 md:px-4 pb-10 pt-2 space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-3 md:p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {variant === 'history' ? (
            <span
              className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white"
              style={{ color: resolvedAccent, border: `1.5px solid ${resolvedAccent}` }}
            >
              модуль {moduleIndex}
            </span>
          ) : (
            <span
              className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white"
              style={{ backgroundColor: resolvedAccent }}
            >
              Модуль {moduleIndex}
            </span>
          )}
          <div className="flex items-center gap-2 min-w-0 text-sm font-bold text-gray-800">
            <BookOpen className="w-4 h-4 shrink-0" style={{ color: resolvedAccent }} />
            <span className="truncate">{themeTitle}</span>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onPartChange('theory')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-black transition-all border-2 ${
                activePart === 'theory' ? 'text-white border-transparent' : 'bg-white'
              }`}
              style={
                activePart === 'theory'
                  ? { backgroundColor: resolvedAccent, borderColor: resolvedAccent }
                  : inactivePill
              }
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Часть 1. Теория
            </button>
            <button
              type="button"
              onClick={() => onPartChange('practice')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-black transition-all border-2 ${
                activePart === 'practice' ? 'text-white border-transparent' : 'bg-white'
              }`}
              style={
                activePart === 'practice'
                  ? { backgroundColor: resolvedAccent, borderColor: resolvedAccent }
                  : inactivePill
              }
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Часть 2. Практика
            </button>
          </div>

          {practiceCount > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar max-w-full">
              <button
                type="button"
                onClick={() => scrollNav(-1)}
                className="w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center hover:opacity-90"
                style={{ color: resolvedAccent, borderColor: `${resolvedAccent}55`, backgroundColor: `${resolvedAccent}12` }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollNav(1)}
                className="w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center hover:opacity-90"
                style={{ color: resolvedAccent, borderColor: `${resolvedAccent}55`, backgroundColor: `${resolvedAccent}12` }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {numbers.map((i) => {
                const node = navBtn(i);
                if (insertAfterIdx !== null && i === insertAfterIdx) {
                  return (
                    <span key={`wrap-${i}`} className="contents">
                      {node}
                      <button
                        type="button"
                        onClick={() => {
                          if (passage) setTextOpen(true);
                          onPartChange(passage ? 'practice' : 'theory');
                        }}
                        title="Текст"
                        className="w-8 h-8 shrink-0 rounded-lg text-[12px] font-black border border-gray-200 bg-white text-gray-700 mx-0.5"
                        style={{ borderColor: undefined }}
                      >
                        T
                      </button>
                    </span>
                  );
                }
                return node;
              })}

              {insertAfterIdx === null && !noText && (
                <button
                  type="button"
                  onClick={() => onPartChange('theory')}
                  title="Теория"
                  className={`w-8 h-8 shrink-0 rounded-lg text-[12px] font-black border transition-colors ${
                    activePart === 'theory'
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                  style={activePart === 'theory' ? { backgroundColor: resolvedAccent } : undefined}
                >
                  T
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">{themeTitle}</h1>
          {!noText && passage && activePart === 'practice' && (
            <button
              type="button"
              onClick={() => setTextOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1D26] hover:bg-black text-white text-[11px] font-black uppercase tracking-wide"
            >
              <Menu className="w-4 h-4" />
              {textOpen ? 'Скрыть текст' : 'Открыть текст'}
            </button>
          )}
        </div>

        {!noText && passage && textOpen && activePart === 'practice' && (
          <div className="mb-6 p-4 md:p-5 rounded-xl bg-gray-50 border border-gray-200 text-sm leading-relaxed text-gray-800">
            {passage}
          </div>
        )}

        {activePart === 'theory' ? theoryBlocks : practiceSlot}
      </div>
    </div>
  );
}
