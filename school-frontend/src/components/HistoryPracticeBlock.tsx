import { type FocusEvent, type ReactNode } from 'react';
import { Check, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { resolveUploadUrl } from '../lib/api';
import { design } from '../lib/designTokens';
import { ExplanationBlock, OptionText, safeHtml, formatQuestionHtml, AnswerSummary } from './LessonTestUI';
import EssayPlainEditor from './EssayPlainEditor';
import EssayStudentTask from './EssayStudentTask';
import EssayResultView from './EssayResultView';
import AskCuratorButton from './AskCuratorButton';
import { EGE_ESSAY_MAX_SCORE, criteriaKindFromBlockType } from '../utils/essayCriteria';
import type { SpellError } from '../utils/spellCheck';
import { isRussianStepDone } from './RussianPracticeBlock';

export { isRussianStepDone as isHistoryStepDone };

const ACCENT = design.historyOrange;
/** Figma Group 19: ДАЛЕЕ 105×28, radius 3px, #0E1829 */
const BTN =
  'inline-flex items-center justify-center gap-1 h-10 md:h-[28px] min-w-[105px] px-2 rounded-[6px] md:rounded-[3px] text-white text-[11px] md:text-[10px] font-bold uppercase tracking-[0.02em] transition-colors hover:bg-black/90 leading-none whitespace-nowrap shrink-0 disabled:opacity-40';
const INPUT =
  'w-full px-4 py-3.5 rounded-[10px] border bg-white text-[15px] placeholder:text-[#9CA3AF] outline-none transition-all resize-y';

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
  handleAnswerToggle: (blockId: string, answerText: string) => void;
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

function getImage(block: any): string {
  const raw = block.questionImage || block.image || block.schemeImage || block.scheme_image || '';
  return resolveUploadUrl(raw);
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

function QuestionHtml({ content, className = '' }: { content: string; className?: string }) {
  if (!content) return null;
  return (
    <div className={`ql-snow ${className}`}>
      <div
        className="ql-editor !p-0 text-[15px] md:text-[16px] leading-relaxed text-[#111827] font-medium [&_p]:mb-3 [&_p.ql-blank-line]:min-h-[1.1em] [&_strong]:font-bold [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px] md:[&_table]:text-[14px] [&_td]:border [&_td]:border-[#D1D5DB] [&_td]:px-2.5 [&_td]:py-2 [&_th]:border [&_th]:border-[#D1D5DB] [&_th]:px-2.5 [&_th]:py-2 [&_th]:font-bold [&_th]:bg-[#F9FAFB]"
        dangerouslySetInnerHTML={{ __html: formatQuestionHtml(content) }}
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
            <span className="text-emerald-600 font-bold">{'→'} {err.suggestion}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StatusBanners(props: any) {
  const { block, result, isExhausted, attemptsLeft, maxScore, serverSubmission, courseSpellCheck, spellErrors } = props;
  if (!result) return null;
  return (
    <div className="space-y-3 mb-5">
      {result === 'ERROR' && !isExhausted && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between gap-2 text-rose-600 font-bold text-sm">
          <span className="flex items-center gap-2"><XCircle className="w-5 h-5" /> Ошибка</span>
          <span className="text-xs bg-white/70 px-2 py-1 rounded-lg">Осталось попыток: {attemptsLeft}</span>
        </div>
      )}
      {result === 'ERROR' && isExhausted && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between gap-2 text-rose-600 font-bold text-sm">
          <span className="flex items-center gap-2"><XCircle className="w-5 h-5" /> Попытки закончились</span>
          <span className="text-xs bg-white px-2 py-1 rounded-lg">Балл: 0 / {maxScore}</span>
        </div>
      )}
      {result === 'SUCCESS' && (
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center justify-between gap-2 text-emerald-600 font-bold text-sm">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Верно</span>
          <span className="text-xs bg-white px-2 py-1 rounded-lg">Балл: {maxScore} / {maxScore}</span>
        </div>
      )}
      {result === 'PENDING' && (
        <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl text-orange-700 font-bold text-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Clock className="w-5 h-5" /> Отправлено</span>
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

/** Figma pdf-page-05 — History practice tasks 1:1 */
export default function HistoryPracticeBlock({
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
  handleAnswerToggle,
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

  const imageSrc = getImage(block);
  const hasOptions = Array.isArray(block.options) && block.options.length > 0;
  const isEssay = block.type === 'essay' || block.type === 'essay_final';
  const isTableTask =
    block.historyLayout === 'table' ||
    block.type === 'matching' ||
    (typeof block.question === 'string' && /<table/i.test(block.question));

  const hasAnswer = (() => {
    if (block.type === 'matching' && block.pairs) {
      return selected.some((s: string) => String(s).includes('|||') && String(s).split('|||')[1]?.trim());
    }
    if (block.type === 'test') return selected.length > 0;
    const t = (selected[0] || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    return t.length > 0;
  })();

  const goNext = async () => {
    if (!isLocked && hasAnswer) await handleSubmitTest(block);
    if (stepIndex < totalSteps - 1) {
      onNext();
    } else if (isLocked && onComplete) {
      onComplete();
    }
  };

  const textValue =
    isLocked && serverSubmission?.answer && block.type !== 'test'
      ? stripHtml(serverSubmission.answer)
      : stripHtml(selected[0] || '');

  const focusInput = (e: FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    e.currentTarget.style.borderColor = ACCENT;
    e.currentTarget.style.boxShadow = `0 0 0 2px ${ACCENT}33`;
  };
  const blurInput = (e: FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    e.currentTarget.style.borderColor = design.border;
    e.currentTarget.style.boxShadow = 'none';
  };

  const answerInput = (rows = 4, minH?: string) => (
    <textarea
      disabled={isLocked}
      value={textValue}
      onChange={(e) => {
        if (!isLocked) handleTextAnswerChange(block.id, e.target.value);
      }}
      placeholder="Введите ответ"
      rows={rows}
      className={`${INPUT} ${minH || 'min-h-[100px]'}`}
      style={{ borderColor: design.border, color: design.textPrimary }}
      onFocus={focusInput}
      onBlur={blurInput}
    />
  );

  const renderCheckboxes = () => (
    <div className="space-y-2.5">
      {block.options.map((opt: any, idx: number) => {
        const checked = selected.includes(opt.text);
        return (
          <button
            key={idx}
            type="button"
            disabled={isLocked}
            onClick={() => {
              if (!isLocked) handleAnswerToggle(block.id, opt.text);
            }}
            className={`w-full flex items-start gap-3 px-3.5 py-3.5 rounded-[10px] border text-left transition-all disabled:opacity-70 ${
              checked ? 'border-transparent text-white' : 'bg-white border-[#E5E7EB] text-[#111827] hover:border-gray-300'
            }`}
            style={checked ? { backgroundColor: ACCENT } : undefined}
          >
            <span
              className={`mt-0.5 w-[18px] h-[18px] shrink-0 rounded-[4px] border-2 flex items-center justify-center ${
                checked ? 'border-white bg-white/20' : 'border-[#D1D5DB] bg-white'
              }`}
            >
              {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </span>
            <span className="text-[15px] leading-snug flex-1">
              <span className="font-bold mr-1">{idx + 1})</span>
              <OptionText text={opt.text} />
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderMissingElements = () => {
    const items = hasOptions
      ? block.options.map((o: any) => o.text)
      : Array.isArray(block.rightColumn)
        ? block.rightColumn
        : Array.isArray(block.pairs)
          ? block.pairs.map((p: any) => p.right || p.left)
          : [];
    if (!items.length) return null;
    return (
      <div>
        <p className="font-bold text-[#111827] mb-2.5 text-[15px]">Пропущенные элементы:</p>
        <ol className="space-y-1.5 text-[14px] md:text-[15px] text-[#1F2937]">
          {items.map((t: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold shrink-0">{i + 1})</span>
              <OptionText text={t} />
            </li>
          ))}
        </ol>
      </div>
    );
  };

  const renderMatchingInputs = () => {
    if (block.type !== 'matching' || !Array.isArray(block.pairs)) return null;
    return (
      <div className="flex flex-wrap gap-2.5 mt-3 mb-1">
        {block.pairs.map((pair: any, idx: number) => {
          const current = selected.find((s: string) => s.startsWith(`${pair.left}|||`));
          const value = current ? current.split('|||')[1] : '';
          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 w-14">
              <span
                className="w-9 h-9 rounded-[8px] text-white text-[13px] font-bold flex items-center justify-center"
                style={{ backgroundColor: ACCENT }}
              >
                {pair.left || String.fromCharCode(1040 + idx)}
              </span>
              <input
                type="text"
                disabled={isLocked}
                value={value}
                onChange={(e) => {
                  if (!isLocked) handleMatchingChange(block.id, pair.left, e.target.value);
                }}
                className="w-full h-10 text-center font-bold rounded-[8px] border outline-none"
                style={{ borderColor: design.border }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = ACCENT;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = design.border;
                }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const taskLabel = (
    <p className="text-[17px] md:text-[18px] font-extrabold text-[#111827] mb-3 tracking-tight">
      {`Задание ${stepIndex + 1}`}
    </p>
  );

  const mapFrame = imageSrc ? (
    <div className="rounded-[12px] overflow-hidden border border-[#E5E7EB] bg-[#F9FAFB]">
      <img src={imageSrc} alt="" className="w-full h-auto object-contain max-h-[min(52vh,520px)] md:max-h-[min(42vh,420px)] mx-auto block" />
    </div>
  ) : null;

  let body: ReactNode;

  if (isEssay) {
    body = (
      <>
        <EssayStudentTask block={block} compact />
        <div className="relative mt-4">
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
      </>
    );
  } else if (imageSrc && hasOptions && block.type === 'test') {
    body = (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-8 items-start">
        {mapFrame}
        <div className="space-y-3 min-w-0">
          {taskLabel}
          <QuestionHtml content={block.question || ''} />
          {renderCheckboxes()}
        </div>
      </div>
    );
  } else if (imageSrc && (block.type === 'test_short' || block.type === 'written' || (block.type === 'test' && !hasOptions))) {
    body = (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-8 items-start">
        {mapFrame}
        <div className="space-y-3 min-w-0">
          {taskLabel}
          <QuestionHtml content={block.question || ''} />
          {answerInput(4, 'min-h-[min(18vh,120px)] max-h-[28vh]')}
        </div>
      </div>
    );
  } else if (isTableTask) {
    body = (
      <div className="space-y-4">
        {taskLabel}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(220px,1fr)] gap-4 xl:gap-6 items-start">
          <div className="min-w-0 space-y-3">
            <QuestionHtml content={block.question || ''} />
            {imageSrc && !/<table/i.test(block.question || '') && (
              <img src={imageSrc} alt="" className="w-full max-h-[min(40vh,20rem)] md:max-h-[min(28vh,16rem)] rounded-[12px] object-contain border border-[#E5E7EB]" />
            )}
          </div>
          <div className="space-y-3 min-w-0">
            {renderMissingElements()}
            {renderMatchingInputs()}
            {(block.type !== 'matching' || !block.pairs?.length) && answerInput(3, 'min-h-[min(12vh,72px)] max-h-[22vh]')}
          </div>
        </div>
      </div>
    );
  } else if (block.type === 'test' && hasOptions) {
    body = (
      <div className="space-y-4">
        {taskLabel}
        <QuestionHtml content={block.question || ''} />
        {renderCheckboxes()}
      </div>
    );
  } else {
    body = (
      <div className="space-y-4">
        {taskLabel}
        <QuestionHtml content={block.question || ''} className="font-semibold [&_.ql-editor]:font-semibold" />
        {imageSrc && (
          <img src={imageSrc} alt="" className="w-full max-h-80 md:max-h-72 rounded-[12px] object-contain border border-[#E5E7EB]" />
        )}
        {answerInput(block.type === 'written' ? 5 : 3, block.type === 'written' ? 'min-h-[min(22vh,140px)] max-h-[36vh]' : 'min-h-[min(14vh,100px)] max-h-[28vh]')}
        {courseSpellCheck && spellErrors?.[block.id]?.length > 0 && (
          <SpellErrorsPanel errors={spellErrors[block.id]} />
        )}
      </div>
    );
  }

  void setTestAnswers;
  void answersKey;
  void setSafeLocal;

  const nextLabel =
    stepIndex >= totalSteps - 1 ? (isLocked ? 'ГОТОВО' : 'ОТПРАВИТЬ') : 'ДАЛЕЕ >';

  return (
    <div className="w-full h-full min-h-0 flex flex-col font-[Golos_Text,system-ui,sans-serif]">
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-0.5">
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

      {body}

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

      <div className="pt-5">
        <button type="button" onClick={goNext} className={BTN} style={{ backgroundColor: '#0E1829' }}>
          {nextLabel}
        </button>
      </div>
      </div>
    </div>
  );
}
