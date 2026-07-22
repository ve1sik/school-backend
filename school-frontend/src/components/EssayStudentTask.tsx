import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { QuestionBlock } from './LessonTestUI';

type Props = {
  block: {
    question?: string;
    source?: string;
  };
  questionMode?: 'html' | 'quill';
  compact?: boolean;
};

/** Задание + отрывок для сочинения (без поля ответа ученика). */
export default function EssayStudentTask({ block, questionMode = 'html', compact = false }: Props) {
  const [sourceExpanded, setSourceExpanded] = useState(false);

  return (
    <div className={compact ? 'space-y-3 mb-3' : 'space-y-5 mb-6'}>
      <div className={`rounded-2xl border border-gray-100 bg-gray-50/80 ${compact ? 'p-3 md:p-4' : 'p-4 md:p-5'}`}>
        <p className={`text-[10px] font-black uppercase tracking-widest text-gray-400 ${compact ? 'mb-2' : 'mb-3'}`}>Задание</p>
        <QuestionBlock content={block.question || ''} mode={questionMode} compact={compact} />
      </div>
      {block.source?.trim() && (
        <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/50 p-4 md:p-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Текст для анализа</p>
            <button
              type="button"
              onClick={() => setSourceExpanded((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-900"
            >
              {sourceExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {sourceExpanded ? 'Свернуть' : 'Развернуть'}
            </button>
          </div>
          <div
            className={`font-serif text-base md:text-lg leading-relaxed whitespace-pre-wrap text-gray-800 custom-scrollbar ${
              sourceExpanded ? 'max-h-none' : 'max-h-[min(70vh,560px)] overflow-y-auto'
            }`}
          >
            {block.source}
          </div>
        </div>
      )}
    </div>
  );
}
