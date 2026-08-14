import ReactQuill from 'react-quill-new';

export const safeHtml = (text: unknown): string => {
  if (!text || typeof text !== 'string') return '';
  return text;
};

/** Сохраняет пустые строки из Quill (<p><br></p>) как видимые отступы в условии задания. */
export const formatQuestionHtml = (text: unknown): string => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '<p class="ql-blank-line">&nbsp;</p>');
};

export const hasRichText = (text: unknown): boolean =>
  typeof text === 'string' && /<[a-z][\s\S]*>/i.test(text);

export const getOptionLetter = (idx: number) => String(idx + 1);

export const LESSON_TEST_STYLES = `
  .test-prose .ql-container.ql-snow,
  .test-prose .ql-toolbar { border: none !important; }
  .test-prose .ql-editor,
  .test-prose-body {
    padding: 0 !important;
    min-height: auto !important;
    font-family: inherit !important;
    font-size: 1.0625rem !important;
    line-height: 1.75 !important;
    color: #1e293b !important;
    font-weight: 500 !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }
  .test-prose .ql-editor p,
  .test-prose-body p { margin-bottom: 0.85em !important; }
  .test-prose .ql-editor p:last-child,
  .test-prose-body p:last-child { margin-bottom: 0 !important; }
  .test-prose .ql-editor p.ql-blank-line,
  .test-prose-body p.ql-blank-line {
    min-height: 1.1em !important;
    margin-bottom: 0.85em !important;
  }
  .test-prose .ql-editor strong,
  .test-prose-body strong { font-weight: 800 !important; color: #0f172a !important; }
  .test-prose .ql-editor em,
  .test-prose-body em { font-style: italic !important; }
  .test-prose .ql-editor u,
  .test-prose-body u { text-underline-offset: 3px !important; }
  .test-prose .ql-editor img,
  .test-prose-body img {
    max-width: 100% !important;
    border-radius: 0.75rem !important;
    margin: 0.75rem 0 !important;
  }
  .test-prose .ql-editor ol,
  .test-prose .ql-editor ul,
  .test-prose-body ol,
  .test-prose-body ul {
    padding-left: 1.35em !important;
    margin: 0.5em 0 0.75em !important;
  }
  .test-prose .ql-editor li,
  .test-prose-body li { margin-bottom: 0.35em !important; }
  .test-option-text {
    flex: 1;
    min-width: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.55;
    color: inherit;
  }
  .test-option-text.ql-editor { padding: 0 !important; min-height: 0 !important; font-size: inherit !important; font-weight: inherit !important; }
  .test-option-text p { margin: 0 !important; display: inline !important; }
  .theory-read-only.test-prose .ql-container.ql-snow {
    border: none !important;
    font-family: inherit !important;
    font-size: inherit !important;
  }
  .theory-read-only.test-prose .ql-editor {
    padding: 0 !important;
    color: inherit !important;
  }
`;

type QuestionBlockProps = {
  content: string;
  mode?: 'quill' | 'html';
  compact?: boolean;
};

export function QuestionBlock({ content, mode = 'html', compact = false }: QuestionBlockProps) {
  return (
    <div className={`rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 shadow-sm ring-1 ring-indigo-50 ${compact ? 'p-3 md:p-4 mb-3' : 'p-5 md:p-7 mb-8'}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500 flex items-center gap-2 ${compact ? 'mb-2' : 'mb-4'}`}>
        <span className="inline-flex w-5 h-5 rounded-md bg-indigo-100 items-center justify-center text-[9px]">?</span>
        Условие задания
      </p>
      {mode === 'quill' ? (
        <div className="theory-read-only test-prose">
          <ReactQuill theme="snow" value={content || ''} readOnly modules={{ toolbar: false }} />
        </div>
      ) : (
        <div className="ql-snow test-prose">
          <div className="ql-editor test-prose-body" dangerouslySetInnerHTML={{ __html: formatQuestionHtml(content) }} />
        </div>
      )}
    </div>
  );
}

type OptionTextProps = {
  text: string;
  className?: string;
};

export function OptionText({ text, className = '' }: OptionTextProps) {
  if (hasRichText(text)) {
    return (
      <span
        className={`ql-editor test-option-text ${className}`}
        dangerouslySetInnerHTML={{ __html: safeHtml(text) }}
      />
    );
  }
  return <span className={`test-option-text ${className}`}>{text}</span>;
}

type ExplanationBlockProps = {
  content: string;
  mode?: 'quill' | 'html';
};

export function ExplanationBlock({ content, mode = 'html' }: ExplanationBlockProps) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/80 to-white p-5 md:p-6">
      <h5 className="flex items-center gap-2 text-purple-700 font-black text-xs uppercase tracking-[0.15em] mb-4">
        Разбор задания
      </h5>
      {mode === 'quill' ? (
        <div className="theory-read-only test-prose text-[15px]">
          <ReactQuill theme="snow" value={content || ''} readOnly modules={{ toolbar: false }} />
        </div>
      ) : (
        <div className="ql-snow test-prose">
          <div className="ql-editor test-prose-body text-[15px]" dangerouslySetInnerHTML={{ __html: safeHtml(content) }} />
        </div>
      )}
    </div>
  );
}

export function getOptionLetterClass(
  isChecked: boolean,
  isLocked: boolean,
  result: string | undefined,
  isExhausted: boolean,
  opt: { isCorrect?: boolean },
) {
  const showCorrect = result === 'SUCCESS' || result === 'GRADED' || (isExhausted && opt.isCorrect);

  if (isLocked || isExhausted) {
    if (showCorrect && opt.isCorrect) {
      return 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/25';
    }
    if (isChecked && !opt.isCorrect) {
      return 'bg-rose-500 border-rose-500 text-white';
    }
    if (isChecked) {
      return 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/25';
    }
    return 'bg-gray-50 border-gray-200 text-gray-400';
  }
  if (isChecked) {
    return 'bg-[#A855F7] border-[#A855F7] text-white shadow-md shadow-purple-500/25';
  }
  return 'bg-white border-gray-200 text-gray-600 group-hover:border-purple-300 group-hover:text-purple-700';
}

function stripPlain(html: string) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function optionIndexLabel(block: any, answerText: string): string {
  const idx = (block.options || []).findIndex((o: any) => o.text === answerText);
  return idx >= 0 ? String(idx + 1) : stripPlain(answerText);
}

export function formatUserAnswer(block: any, selected: string[], serverAnswer?: string): string {
  if (block.type === 'test' && Array.isArray(block.options)) {
    const picks = selected.length
      ? selected
      : (serverAnswer || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
    if (!picks.length) return '—';
    return picks.map((a) => optionIndexLabel(block, a)).join(', ');
  }
  if (block.type === 'test_short' || block.type === 'written') {
    const raw = serverAnswer || selected[0] || '';
    return stripPlain(raw) || '—';
  }
  if (block.type === 'matching' && block.pairs) {
    const pairs = selected.length
      ? selected
      : (serverAnswer || '').split(', ').map((s) => s.replace(' - ', '|||'));
    if (!pairs.length) return '—';
    return pairs
      .map((p) => {
        const [left, right] = String(p).includes('|||') ? String(p).split('|||') : ['', p];
        return left ? `${left} → ${right || '?'}` : String(p);
      })
      .join('; ');
  }
  return serverAnswer || selected.join(', ') || '—';
}

export function formatCorrectAnswer(block: any): string {
  if (block.type === 'test' && Array.isArray(block.options)) {
    const correct = block.options.filter((o: any) => o.isCorrect);
    if (!correct.length) return '—';
    return correct.map((o: any, i: number) => {
      const idx = block.options.indexOf(o);
      return idx >= 0 ? String(idx + 1) : stripPlain(o.text);
    }).join(', ');
  }
  if (block.type === 'test_short' || block.type === 'written') {
    return (block.correctAnswers || []).join(' / ') || '—';
  }
  if (block.type === 'matching' && block.pairs) {
    return block.pairs.map((p: any) => `${p.left} → ${p.right}`).join('; ');
  }
  return '—';
}

type AnswerSummaryProps = {
  block: any;
  selected: string[];
  serverAnswer?: string;
  showCorrect?: boolean;
};

export function AnswerSummary({ block, selected, serverAnswer, showCorrect = true }: AnswerSummaryProps) {
  const userText = formatUserAnswer(block, selected, serverAnswer);
  const correctText = formatCorrectAnswer(block);
  if (userText === '—' && correctText === '—') return null;

  return (
    <div className="space-y-3 mb-4">
      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400 mb-1.5">Ваш ответ</p>
        <p className="text-[15px] font-semibold text-gray-900">{userText}</p>
      </div>
      {showCorrect && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600 mb-1.5">Правильный ответ</p>
          <p className="text-[15px] font-semibold text-emerald-900">{correctText}</p>
        </div>
      )}
    </div>
  );
}
