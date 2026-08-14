import { useMemo, useState, type FocusEvent } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { ExplanationBlock, OptionText, safeHtml, AnswerSummary } from './LessonTestUI';
import EssayPlainEditor from './EssayPlainEditor';
import EssayStudentTask from './EssayStudentTask';
import EssayResultView from './EssayResultView';
import AskCuratorButton from './AskCuratorButton';
import { EGE_ESSAY_MAX_SCORE, criteriaKindFromBlockType } from '../utils/essayCriteria';
import type { SpellError } from '../utils/spellCheck';
import { design } from '../lib/designTokens';

const CYR_LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Л', 'М', 'Н', 'О'];
const BTN =
  'inline-flex items-center justify-center gap-1 px-6 py-[14px] rounded-[10px] hover:bg-black text-white text-[12px] font-bold uppercase tracking-[0.04em] transition-colors disabled:opacity-40';
const INPUT =
  'w-full px-4 py-3.5 rounded-[10px] border bg-white text-[15px] placeholder:text-[#9CA3AF] outline-none focus:ring-2 transition-all';

type Props = {
  block: any;
  stepIndex: number;
  totalSteps: number;
  testAnswers: Record<string, string[]>;
  testResults: Record<string, string>;
  attemptsUsed: Record<string, number>;
  submissions: any[];
  spellErrors?: Record<string, SpellError[]>;
  courseSpellCheck?: boolean;
  courseTitle?: string;
  lessonTitle?: string;
  handleTextAnswerChange: (blockId: string, text: string) => void;
  handleMatchingChange: (blockId: string, leftText: string, rightText: string) => void;
  handleSubmitTest: (block: any) => void | Promise<void>;
  onNext: () => void;
  onComplete?: () => void;
  setTestAnswers: (next: Record<string, string[]>) => void;
  answersKey?: string;
  setSafeLocal?: (key: string, value: unknown) => void;
};

function stripHtml(html: string) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseOptionNumbers(raw: string, optionCount: number): number[] {
  const cleaned = (raw || '').trim();
  if (!cleaned) return [];
  const fromSeparators = cleaned
    .split(/[\s,;.]+/)
    .map((p) => parseInt(p, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= optionCount);
  if (fromSeparators.length > 0) return [...new Set(fromSeparators)];

  if (/^\d+$/.test(cleaned) && cleaned.length > 1 && cleaned.length <= optionCount) {
    const digits = cleaned.split('').map((d) => parseInt(d, 10));
    if (digits.every((n) => n >= 1 && n <= optionCount)) return [...new Set(digits)];
  }
  return [];
}

function resolveBlockState(
  block: any,
  testAnswers: Record<string, string[]>,
  testResults: Record<string, string>,
  attemptsUsed: Record<string, number>,
  submissions: any[],
) {
  const serverSubmission = submissions?.find((s: any) => s.blockId === block.id || s.block_id === block.id);
  let result = testResults?.[block.id];
  let currentAttempts = attemptsUsed?.[block.id] || 0;
  const maxAttempts = block.maxAttempts || 3;
  const maxScore = block.maxScore || 3;

  if (serverSubmission) {
    if (serverSubmission.status === 'GRADED') {
      if (['test', 'test_short', 'matching'].includes(block.type)) {
        if (Number(serverSubmission.score) > 0) result = 'SUCCESS';
        else {
          result = 'ERROR';
          currentAttempts = maxAttempts;
        }
      } else {
        result = 'GRADED';
      }
    } else if (serverSubmission.status === 'REVIEW' || serverSubmission.status === 'PENDING') {
      result = 'PENDING';
    } else if (serverSubmission.status === 'REVISION') {
      result = 'REVISION';
    }
  }

  const fromState = Array.isArray(testAnswers?.[block.id]) ? testAnswers[block.id] : [];
  const selected =
    fromState.length > 0 && fromState[0] && fromState[0] !== '<p><br></p>'
      ? fromState
      : result === 'REVISION' && serverSubmission?.answer
        ? [serverSubmission.answer]
        : fromState;

  const attemptsLeft = maxAttempts - currentAttempts;
  const isExhausted = attemptsLeft <= 0;
  const isLocked = isExhausted || result === 'SUCCESS' || result === 'PENDING' || result === 'GRADED';

  return { serverSubmission, result, maxScore, selected, attemptsLeft, isExhausted, isLocked };
}

function QuestionHtml({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="ql-snow mb-5">
      <div
        className="ql-editor !p-0 text-[15px] md:text-[16px] leading-relaxed text-[#111827] font-bold [&_p]:mb-2 [&_strong]:font-extrabold"
        dangerouslySetInnerHTML={{ __html: safeHtml(content) }}
      />
    </div>
  );
}

function SpellErrorsPanel({ errors }: { errors: SpellError[] }) {
  if (!errors?.length) return null;
  return (
    <div className="mt-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs">
      <p className="font-black text-rose-600 uppercase tracking-widest mb-2">Возможные ошибки</p>
      <div className="flex flex-wrap gap-2">
        {errors.map((err, i) => (
          <span key={i} className="bg-white border border-rose-100 rounded-lg px-2 py-1">
            <span className="line-through text-rose-600 font-bold mr-1">{err.word}</span>
            <span className="text-emerald-600 font-bold">→ {err.suggestion}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusBanners({
  block,
  result,
  isExhausted,
  attemptsLeft,
  maxScore,
  serverSubmission,
  courseSpellCheck,
  spellErrors,
}: any) {
  if (!result) return null;
  return (
    <div className="space-y-3 mb-5">
      {result === 'ERROR' && !isExhausted && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between gap-2 text-rose-600 font-bold text-sm">
          <span className="flex items-center gap-2">
            <XCircle className="w-5 h-5" /> Ошибка
          </span>
          <span className="text-xs bg-white/70 px-2 py-1 rounded-lg">Осталось попыток: {attemptsLeft}</span>
        </div>
      )}
      {result === 'ERROR' && isExhausted && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between gap-2 text-rose-600 font-bold text-sm">
          <span className="flex items-center gap-2">
            <XCircle className="w-5 h-5" /> Попытки закончились
          </span>
          <span className="text-xs bg-white px-2 py-1 rounded-lg">
            Балл: 0 / {maxScore}
          </span>
        </div>
      )}
      {result === 'SUCCESS' && (
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center justify-between gap-2 text-emerald-600 font-bold text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Верно
          </span>
          <span className="text-xs bg-white px-2 py-1 rounded-lg">
            Балл: {maxScore} / {maxScore}
          </span>
        </div>
      )}
      {result === 'PENDING' && (
        <div className="bg-violet-50 border border-violet-100 p-3 rounded-xl text-violet-700 font-bold text-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" /> Отправлено
            </span>
            <span className="text-xs bg-white px-2 py-1 rounded-lg">Ожидает проверки</span>
          </div>
          {block.type === 'written' && courseSpellCheck && spellErrors?.[block.id]?.length > 0 && (
            <SpellErrorsPanel errors={spellErrors[block.id]} />
          )}
        </div>
      )}
      {result === 'REVISION' && serverSubmission?.comment && (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl text-sm text-orange-800">
          <p className="font-black mb-1">На доработку</p>
          <p className="whitespace-pre-wrap font-medium">{serverSubmission.comment}</p>
        </div>
      )}
      {result === 'GRADED' && serverSubmission && (block.type === 'essay' || block.type === 'essay_final') && (
        <EssayResultView
          answer={serverSubmission.answer || ''}
          score={Number(serverSubmission.score) || 0}
          maxScore={Number(serverSubmission.max_score || block.maxScore || EGE_ESSAY_MAX_SCORE)}
          comment={serverSubmission.comment}
          criteriaScores={serverSubmission.criteria_scores || serverSubmission.criteriaScores}
          errorAnnotations={serverSubmission.error_annotations || serverSubmission.errorAnnotations}
          criteriaKind={criteriaKindFromBlockType(block.type)}
        />
      )}
      {result === 'GRADED' && serverSubmission && block.type === 'written' && (
        <EssayResultView
          answer={serverSubmission.answer || ''}
          score={Number(serverSubmission.score) || 0}
          maxScore={Number(serverSubmission.max_score || block.maxScore || 100)}
          comment={serverSubmission.comment}
          errorAnnotations={serverSubmission.error_annotations || serverSubmission.errorAnnotations}
          scoreTitle="Оценка за письменное задание"
        />
      )}
    </div>
  );
}

export default function RussianPracticeBlock({
  block,
  stepIndex,
  totalSteps,
  testAnswers,
  testResults,
  attemptsUsed,
  submissions,
  spellErrors,
  courseSpellCheck,
  courseTitle,
  lessonTitle,
  handleTextAnswerChange,
  handleMatchingChange,
  handleSubmitTest,
  onNext,
  onComplete,
  setTestAnswers,
  answersKey,
  setSafeLocal,
}: Props) {
  const { serverSubmission, result, maxScore, selected, attemptsLeft, isExhausted, isLocked } = resolveBlockState(
    block,
    testAnswers,
    testResults,
    attemptsUsed,
    submissions,
  );

  const notesCount = Number(block.notesCount || block.notes_count || 0) || 0;
  const [notes, setNotes] = useState<string[]>(() => Array.from({ length: Math.max(notesCount, 0) }, () => ''));

  const rightColumn: string[] = useMemo(() => {
    if (Array.isArray(block.rightColumn) && block.rightColumn.length) return block.rightColumn.map(String);
    if (Array.isArray(block.sentences) && block.sentences.length) return block.sentences.map(String);
    if (Array.isArray(block.rightItems) && block.rightItems.length) return block.rightItems.map(String);
    if (Array.isArray(block.pairs)) {
      const rights = block.pairs.map((p: any) => String(p.right || '').trim()).filter(Boolean);
      if (rights.every((r: string) => /^\d+$/.test(r))) return [];
      return rights;
    }
    return [];
  }, [block]);

  const leftTitle = block.leftTitle || block.left_title || 'Грамматические ошибки';
  const rightTitle = block.rightTitle || block.right_title || 'Предложения';

  const testNumberAnswer = useMemo(() => {
    if (block.type !== 'test' || !Array.isArray(block.options)) return selected[0] || '';
    const idxs = block.options
      .map((opt: any, i: number) => (selected.includes(opt.text) ? i + 1 : null))
      .filter(Boolean);
    if (idxs.length) return idxs.join('');
    if (selected.length === 1 && !block.options.some((o: any) => o.text === selected[0])) {
      return selected[0];
    }
    return '';
  }, [block, selected]);

  const setTestFromTyped = (raw: string) => {
    if (!Array.isArray(block.options)) {
      handleTextAnswerChange(block.id, raw);
      return;
    }
    const nums = parseOptionNumbers(raw, block.options.length);
    if (nums.length > 0) {
      const texts = nums.map((n) => block.options[n - 1]?.text).filter(Boolean);
      const next = { ...testAnswers, [block.id]: texts };
      setTestAnswers(next);
      if (answersKey && setSafeLocal) setSafeLocal(answersKey, next);
      return;
    }
    handleTextAnswerChange(block.id, raw);
  };

  const hasAnswer = (() => {
    if (block.type === 'matching' && block.pairs) {
      return (
        selected.length === block.pairs.length &&
        selected.every((s: string) => {
          const parts = s.split('|||');
          return parts.length === 2 && parts[1]?.trim();
        })
      );
    }
    if (block.type === 'test') return selected.length > 0 && selected.some((s: string) => String(s).trim());
    const t = (selected[0] || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    return t.length > 0;
  })();

  const goNext = async () => {
    if (!isLocked && hasAnswer) {
      await handleSubmitTest(block);
    }
    if (stepIndex < totalSteps - 1) {
      onNext();
    } else if (isLocked && onComplete) {
      onComplete();
    }
  };

  const passageHtml = block.passage || block.sourceText || block.source_text || '';

  const renderMatching = () => {
    const pairs = Array.isArray(block.pairs) ? block.pairs : [];
    return (
      <div className="space-y-6">
        <div className={`grid grid-cols-1 ${rightColumn.length ? 'lg:grid-cols-2' : ''} gap-8 lg:gap-12`}>
          <div>
            <p
              className="text-[11px] font-black uppercase tracking-[0.14em] mb-3"
              style={{ color: design.brandPurple }}
            >
              {leftTitle}
            </p>
            <ol className="space-y-3">
              {pairs.map((pair: any, idx: number) => (
                <li key={idx} className="flex gap-2 text-[15px] leading-snug text-gray-800">
                  <span className="font-black shrink-0" style={{ color: design.brandPurple }}>
                    {CYR_LETTERS[idx] || idx + 1})
                  </span>
                  <span>{pair.left}</span>
                </li>
              ))}
            </ol>
          </div>
          {rightColumn.length > 0 && (
            <div>
              <p
                className="text-[11px] font-black uppercase tracking-[0.14em] mb-3"
                style={{ color: design.brandPurple }}
              >
                {rightTitle}
              </p>
              <ol className="space-y-3">
                {rightColumn.map((item, idx) => (
                  <li key={idx} className="flex gap-2 text-[15px] leading-snug text-gray-800">
                    <span className="font-black text-gray-900 shrink-0">{idx + 1})</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {pairs.map((pair: any, idx: number) => {
            const current = selected.find((s: string) => s.startsWith(`${pair.left}|||`));
            let value = current ? current.split('|||')[1] : '';
            if (serverSubmission?.answer && isLocked) {
              const serverPairs = String(serverSubmission.answer).split(', ');
              const serverMatch = serverPairs.find((s: string) => s.startsWith(`${pair.left} - `));
              if (serverMatch) value = serverMatch.split(' - ').slice(1).join(' - ');
            }
            return (
              <div key={idx} className="flex flex-col items-center gap-2 w-[56px]">
                <span
                  className="w-10 h-10 rounded-[8px] text-white text-[14px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: design.brandPurple }}
                >
                  {CYR_LETTERS[idx] || idx + 1}
                </span>
                <input
                  id={`ru-match-${block.id}-${idx}`}
                  type="text"
                  disabled={isLocked}
                  value={value}
                  onChange={(e) => {
                    if (!isLocked) handleMatchingChange(block.id, pair.left, e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      (document.getElementById(`ru-match-${block.id}-${idx + 1}`) as HTMLInputElement | null)?.focus();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      (document.getElementById(`ru-match-${block.id}-${idx - 1}`) as HTMLInputElement | null)?.focus();
                    }
                  }}
                  className="w-full h-11 text-center font-bold text-[16px] rounded-[8px] border outline-none disabled:bg-gray-50"
                  style={{ borderColor: design.border }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = design.brandPurple;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = design.border;
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOptionsList = () => {
    if (!Array.isArray(block.options)) return null;
    return (
      <ol className="space-y-2.5 mb-6">
        {block.options.map((opt: any, idx: number) => (
          <li key={idx} className="flex gap-2 text-[15px] leading-relaxed text-gray-800">
            <span className="font-bold text-gray-900 shrink-0">{idx + 1})</span>
            <OptionText text={opt.text} />
          </li>
        ))}
      </ol>
    );
  };

  const renderPassageNotes = () => (
    <div className="space-y-5">
      <QuestionHtml content={block.question || ''} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(220px,34%)] gap-6 lg:gap-10 items-start">
        <div className="text-[15px] leading-[1.7]" style={{ color: design.textPrimary }}>
          {passageHtml ? (
            <div className="ql-snow">
              <div className="ql-editor !p-0" dangerouslySetInnerHTML={{ __html: safeHtml(passageHtml) }} />
            </div>
          ) : null}
        </div>
        <div className="space-y-2.5">
          {notes.map((n, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[13px] font-semibold w-6 shrink-0" style={{ color: design.textMuted }}>
                {i + 1})
              </span>
              <input
                type="text"
                value={n}
                disabled={isLocked}
                onChange={(e) => {
                  const next = [...notes];
                  next[i] = e.target.value;
                  setNotes(next);
                }}
                placeholder="Для заметок"
                className="w-full px-2.5 py-2 rounded-[8px] border text-[13px] outline-none placeholder:text-[#9CA3AF]"
                style={{ borderColor: design.border }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = design.brandPurple;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = design.border;
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <input
        type="text"
        disabled={isLocked}
        value={isLocked && serverSubmission?.answer ? stripHtml(serverSubmission.answer) : selected[0] || ''}
        onChange={(e) => {
          if (!isLocked) handleTextAnswerChange(block.id, e.target.value);
        }}
        placeholder="Введите ответ"
        className={INPUT}
        style={{
          borderColor: design.border,
          color: design.textPrimary,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = design.brandPurple;
          e.currentTarget.style.boxShadow = `0 0 0 2px ${design.brandPurple}26`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = design.border;
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );

  const answerInputStyle = {
    borderColor: design.border,
    color: design.textPrimary,
  } as const;

  const focusAnswer = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = design.brandPurple;
    e.currentTarget.style.boxShadow = `0 0 0 2px ${design.brandPurple}26`;
  };
  const blurAnswer = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = design.border;
    e.currentTarget.style.boxShadow = 'none';
  };

  const renderShortOrTest = () => (
    <div className="space-y-5">
      {block.type === 'test' && renderOptionsList()}
      <input
        type="text"
        disabled={isLocked}
        value={
          isLocked && serverSubmission?.answer && block.type !== 'test'
            ? stripHtml(serverSubmission.answer)
            : block.type === 'test'
              ? testNumberAnswer
              : selected[0] || ''
        }
        onChange={(e) => {
          if (isLocked) return;
          if (block.type === 'test') setTestFromTyped(e.target.value);
          else handleTextAnswerChange(block.id, e.target.value);
        }}
        placeholder="Введите ответ"
        className={INPUT}
        style={answerInputStyle}
        onFocus={focusAnswer}
        onBlur={blurAnswer}
      />
    </div>
  );

  const renderWritten = () => (
    <div className="space-y-3">
      <textarea
        disabled={isLocked}
        value={
          isLocked && serverSubmission?.answer
            ? stripHtml(serverSubmission.answer)
            : stripHtml(selected[0] || '')
        }
        onChange={(e) => {
          if (!isLocked) handleTextAnswerChange(block.id, e.target.value);
        }}
        placeholder="Введите ответ"
        rows={5}
        className={`${INPUT} resize-y min-h-[120px]`}
        style={answerInputStyle}
        onFocus={focusAnswer}
        onBlur={blurAnswer}
      />
      {courseSpellCheck && spellErrors?.[block.id]?.length > 0 && (
        <SpellErrorsPanel errors={spellErrors[block.id]} />
      )}
    </div>
  );

  const isEssay = block.type === 'essay' || block.type === 'essay_final';
  const useNotesLayout =
    notesCount > 0 && (block.type === 'test_short' || block.type === 'written' || block.type === 'test');

  return (
    <div className="w-full h-full min-h-0 flex flex-col font-[Golos_Text,system-ui,sans-serif]">
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-0.5">
      {isEssay ? (
        <EssayStudentTask block={block} compact />
      ) : (
        <>
          {!useNotesLayout && <QuestionHtml content={block.question || ''} />}
          {(block.questionImage || block.image) && (
            <img
              src={block.questionImage || block.image}
              alt=""
              className="mb-2 max-h-[min(28vh,12rem)] rounded-xl object-contain"
            />
          )}
        </>
      )}

      <StatusBanners
        block={block}
        result={result}
        isExhausted={isExhausted}
        attemptsLeft={attemptsLeft}
        maxScore={maxScore}
        serverSubmission={serverSubmission}
        courseSpellCheck={courseSpellCheck}
        spellErrors={spellErrors}
      />

      {(result === 'SUCCESS' || result === 'ERROR' || result === 'PENDING' || result === 'GRADED') && (
        <AskCuratorButton
          courseTitle={courseTitle}
          lessonTitle={lessonTitle}
          questionLabel={block.question || block.title || 'Задание'}
          blockIndex={stepIndex}
        />
      )}

      {isEssay ? (
        <div className="relative">
          {isLocked && serverSubmission && <div className="absolute inset-0 z-10 cursor-not-allowed" />}
          <EssayPlainEditor
            value={serverSubmission?.answer || selected[0] || ''}
            onChange={(val) => {
              if (!isLocked) handleTextAnswerChange(block.id, val);
            }}
            readOnly={isLocked}
            placeholder="Напишите сочинение по заданию…"
            minRows={6}
          />
        </div>
      ) : block.type === 'matching' ? (
        renderMatching()
      ) : useNotesLayout ? (
        renderPassageNotes()
      ) : block.type === 'written' ? (
        renderWritten()
      ) : (
        renderShortOrTest()
      )}

      {(isLocked || isExhausted) && ['test', 'test_short', 'matching'].includes(block.type) && (
        <AnswerSummary
          block={block}
          selected={selected}
          serverAnswer={serverSubmission?.answer}
          showCorrect={isExhausted || result === 'GRADED' || result === 'ERROR'}
        />
      )}

      {(isLocked || isExhausted) && block.explanation && (
        <ExplanationBlock content={block.explanation || ''} mode="html" />
      )}
      </div>

      <div className="shrink-0 pt-3 pb-0.5 bg-white">
        <button type="button" onClick={goNext} className={BTN} style={{ backgroundColor: design.ink }}>
          {stepIndex >= totalSteps - 1 ? (isLocked ? 'ГОТОВО' : 'ОТПРАВИТЬ') : 'ДАЛЕЕ >'}
        </button>
      </div>
    </div>
  );
}

export function isRussianStepDone(
  block: any,
  testAnswers: Record<string, string[]>,
  testResults: Record<string, string>,
  submissions: any[],
) {
  if (!block) return false;
  if (testResults?.[block.id]) return true;
  const sub = submissions?.find((s: any) => s.blockId === block.id || s.block_id === block.id);
  if (sub) return true;
  const ans = testAnswers?.[block.id];
  if (!Array.isArray(ans) || ans.length === 0) return false;
  if (block.type === 'matching') {
    return ans.some((s) => String(s).includes('|||') && String(s).split('|||')[1]?.trim());
  }
  const t = String(ans[0] || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return t.length > 0;
}
