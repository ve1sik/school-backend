import { type ReactNode } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { ExplanationBlock, OptionText, safeHtml } from './LessonTestUI';
import EssayPlainEditor from './EssayPlainEditor';
import EssayStudentTask from './EssayStudentTask';
import EssayResultView from './EssayResultView';
import AskCuratorButton from './AskCuratorButton';
import { EGE_ESSAY_MAX_SCORE, criteriaKindFromBlockType } from '../utils/essayCriteria';
import type { SpellError } from '../utils/spellCheck';
import { isRussianStepDone } from './RussianPracticeBlock';

export { isRussianStepDone as isHistoryStepDone };

const ACCENT = '#EF6C35';
const BTN =
  'inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#1A1D26] hover:bg-black text-white text-[11px] font-black uppercase tracking-wide transition-colors disabled:opacity-40';
const INPUT =
  'w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#EF6C35] focus:ring-2 focus:ring-[#EF6C35]/20 transition-all min-h-[120px]';

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
  setTestAnswers: (next: Record<string, string[]>) => void;
  answersKey?: string;
  setSafeLocal?: (key: string, value: unknown) => void;
};

function stripHtml(html: string) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getImage(block: any): string {
  const raw = block.questionImage || block.image || '';
  if (!raw) return '';
  if (raw.startsWith('http')) return raw.replace('http://prepodmgy.ru', 'https://prepodmgy.ru');
  const clean = raw.startsWith('/') ? raw.slice(1) : raw;
  if (clean.startsWith('uploads/')) return `https://prepodmgy.ru/${clean}`;
  return `https://prepodmgy.ru/api/${clean}`;
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
        className="ql-editor !p-0 text-[15px] md:text-[16px] leading-relaxed text-gray-900 font-medium [&_p]:mb-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-800 [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-gray-800 [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-bold"
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
    if (stepIndex < totalSteps - 1) onNext();
  };

  const textValue =
    isLocked && serverSubmission?.answer && block.type !== 'test'
      ? stripHtml(serverSubmission.answer)
      : stripHtml(selected[0] || '');

  const setTableAnswer = (raw: string) => {
    handleTextAnswerChange(block.id, raw);
  };

  const renderCheckboxes = () => (
    <div className="space-y-2.5">
      {block.options.map((opt: any, idx: number) => {
        const checked = selected.includes(opt.text);
        return (
          <label
            key={idx}
            className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              checked ? 'border-transparent text-gray-900' : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
            }`}
            style={checked ? { backgroundColor: `${ACCENT}22`, borderColor: ACCENT } : undefined}
          >
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 rounded accent-[#EF6C35]"
              checked={checked}
              disabled={isLocked}
              onChange={() => {
                if (!isLocked) handleAnswerToggle(block.id, opt.text);
              }}
            />
            <span className="text-[15px] leading-snug flex-1">
              <span className="font-bold mr-1">{idx + 1})</span>
              <OptionText text={opt.text} />
            </span>
          </label>
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
          ? block.pairs.map((p: any) => p.right)
          : [];
    if (!items.length) return null;
    return (
      <div className="mt-4">
        <p className="font-bold text-gray-900 mb-2">Пропущенные элементы:</p>
        <ol className="space-y-1.5 text-[15px] text-gray-800">
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
      <div className="flex flex-wrap gap-2 mt-4 mb-2">
        {block.pairs.map((pair: any, idx: number) => {
          const current = selected.find((s: string) => s.startsWith(`${pair.left}|||`));
          const value = current ? current.split('|||')[1] : '';
          return (
            <div key={idx} className="flex flex-col items-center gap-1 w-14">
              <span className="text-xs font-black" style={{ color: ACCENT }}>
                {pair.left || String.fromCharCode(65 + idx)}
              </span>
              <input
                type="text"
                disabled={isLocked}
                value={value}
                onChange={(e) => {
                  if (!isLocked) handleMatchingChange(block.id, pair.left, e.target.value);
                }}
                className="w-full h-10 text-center font-black rounded-lg border border-gray-200 outline-none focus:border-[#EF6C35]"
              />
            </div>
          );
        })}
      </div>
    );
  };

  const answerField = (
    <textarea
      disabled={isLocked}
      value={block.type === 'test' && hasOptions ? '' : textValue}
      onChange={(e) => {
        if (isLocked) return;
        if (isTableTask && block.type !== 'matching') setTableAnswer(e.target.value);
        else if (block.type !== 'test') handleTextAnswerChange(block.id, e.target.value);
        else handleTextAnswerChange(block.id, e.target.value);
      }}
      placeholder="Введите ответ"
      rows={block.type === 'written' || isTableTask ? 5 : 4}
      className={`${INPUT} resize-y ${block.type === 'test' && hasOptions && !isTableTask ? 'hidden' : ''}`}
    />
  );

  // For test with checkboxes we still need a visible answer path — checkboxes only; for table+options show text input
  const showTextAnswer =
    block.type !== 'test' ||
    isTableTask ||
    !hasOptions ||
    block.historyLayout === 'short' ||
    block.type === 'test_short';

  const taskLabel = (
    <p className="text-lg font-black text-gray-900 mb-3">
      Задание {stepIndex + 1}
    </p>
  );

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
    // Map + checkboxes (task 16)
    body = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img src={imageSrc} alt="" className="w-full h-auto object-contain max-h-[520px] mx-auto" />
        </div>
        <div className="space-y-4">
          {taskLabel}
          <QuestionHtml content={block.question || ''} />
          {renderCheckboxes()}
        </div>
      </div>
    );
  } else if (imageSrc && (block.type === 'test_short' || block.type === 'written' || (block.type === 'test' && !hasOptions))) {
    // Map + short answer (task 14)
    body = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img src={imageSrc} alt="" className="w-full h-auto object-contain max-h-[520px] mx-auto" />
        </div>
        <div className="space-y-4">
          {taskLabel}
          <QuestionHtml content={block.question || ''} />
          <textarea
            disabled={isLocked}
            value={textValue}
            onChange={(e) => {
              if (!isLocked) handleTextAnswerChange(block.id, e.target.value);
            }}
            placeholder="Введите ответ"
            rows={4}
            className={`${INPUT} resize-y`}
          />
        </div>
      </div>
    );
  } else if (isTableTask) {
    // Table + missing elements + answer (task 22)
    body = (
      <div className="space-y-4">
        {taskLabel}
        <QuestionHtml content={block.question || ''} />
        {imageSrc && (
          <img src={imageSrc} alt="" className="max-h-64 rounded-xl object-contain border border-gray-100" />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <div />
          <div>{renderMissingElements()}</div>
        </div>
        {renderMatchingInputs()}
        {(block.type !== 'matching' || !block.pairs?.length) && (
          <textarea
            disabled={isLocked}
            value={textValue}
            onChange={(e) => {
              if (!isLocked) handleTextAnswerChange(block.id, e.target.value);
            }}
            placeholder="Введите ответ"
            rows={3}
            className={`${INPUT} resize-y min-h-[80px]`}
          />
        )}
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
    // Default written / short (tasks 6, 21)
    body = (
      <div className="space-y-4">
        {taskLabel}
        <QuestionHtml content={block.question || ''} />
        {imageSrc && (
          <img src={imageSrc} alt="" className="max-h-72 rounded-xl object-contain border border-gray-100" />
        )}
        {showTextAnswer && answerField}
        {courseSpellCheck && spellErrors?.[block.id]?.length > 0 && (
          <SpellErrorsPanel errors={spellErrors[block.id]} />
        )}
      </div>
    );
  }

  // silence unused for matching path setTestAnswers
  void setTestAnswers;
  void answersKey;
  void setSafeLocal;

  return (
    <div className="w-full space-y-5">
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

      {(isLocked || isExhausted) && block.explanation && (
        <ExplanationBlock content={block.explanation || ''} mode="html" />
      )}

      <div className="pt-2 flex justify-start">
        <button type="button" onClick={goNext} className={BTN}>
          {stepIndex >= totalSteps - 1 ? (isLocked ? 'Готово' : 'Отправить') : 'Далее >'}
        </button>
      </div>
    </div>
  );
}
