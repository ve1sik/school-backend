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
  return (
    <div className={compact ? 'space-y-3 mb-3' : 'space-y-5 mb-6'}>
      <div className={`rounded-2xl border border-gray-100 bg-gray-50/80 ${compact ? 'p-3 md:p-4' : 'p-4 md:p-5'}`}>
        <p className={`text-[10px] font-black uppercase tracking-widest text-gray-400 ${compact ? 'mb-2' : 'mb-3'}`}>Задание</p>
        <QuestionBlock content={block.question || ''} mode={questionMode} compact={compact} />
      </div>
      {block.source?.trim() && (
        <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/50 p-4 md:p-6 max-h-[45vh] overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-3">Текст для анализа</p>
          <div className="font-serif text-base md:text-lg leading-relaxed whitespace-pre-wrap text-gray-800">
            {block.source}
          </div>
        </div>
      )}
    </div>
  );
}
