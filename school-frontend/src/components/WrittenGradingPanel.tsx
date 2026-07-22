import { useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, ChevronDown, ChevronUp, Plus, Send, Trash2 } from 'lucide-react';
import {
  ESSAY_ERROR_KINDS,
  buildAnnotatedSegments,
  kindColor,
  kindLabel,
  newAnnotationId,
  normalizeErrorAnnotations,
  stripHtmlToPlain,
  type EssayErrorAnnotation,
  type EssayErrorKind,
} from '../utils/essayErrors';
import ScoreField from './ScoreField';
import { ExpandTextButton, FullscreenTextReader } from './FullscreenTextReader';

type Props = {
  answer: string;
  maxScore: number;
  initialErrors?: unknown;
  initialComment?: string;
  initialScore?: number | null;
  onSave: (payload: {
    score: number;
    comment: string;
    errorAnnotations: EssayErrorAnnotation[];
  }) => Promise<void>;
  onRevision: (comment: string) => Promise<void>;
  isGraded?: boolean;
};

export default function WrittenGradingPanel({
  answer,
  maxScore,
  initialErrors,
  initialComment = '',
  initialScore,
  onSave,
  onRevision,
  isGraded,
}: Props) {
  const plainText = useMemo(() => stripHtmlToPlain(answer), [answer]);
  const [errors, setErrors] = useState<EssayErrorAnnotation[]>(() =>
    normalizeErrorAnnotations(initialErrors),
  );
  const [comment, setComment] = useState(initialComment);
  const [score, setScore] = useState<number>(
    initialScore != null && isGraded ? Number(initialScore) : 0,
  );
  const [selectedKind, setSelectedKind] = useState<EssayErrorKind>('orthography');
  const [draftMessage, setDraftMessage] = useState('');
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(
    null,
  );
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const segments = buildAnnotatedSegments(plainText, errors);

  const captureSelection = () => {
    const el = textRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    setSelection({ start, end, text: plainText.slice(start, end) });
  };

  const addError = () => {
    if (!selection || !draftMessage.trim()) return;
    setErrors((prev) => [
      ...prev,
      {
        id: newAnnotationId(),
        start: selection.start,
        end: selection.end,
        kind: selectedKind,
        message: draftMessage.trim(),
        snippet: selection.text,
      },
    ]);
    setDraftMessage('');
    setSelection(null);
  };

  const handleSave = async () => {
    if (score < 0 || score > maxScore) return;
    await onSave({ score, comment, errorAnnotations: errors });
  };

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-[1fr_260px] gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">
              Ответ ученика — выделите фрагмент с ошибкой
            </p>
            <ExpandTextButton onClick={() => setFullscreenOpen(true)} />
          </div>
          <textarea
            ref={textRef}
            readOnly
            value={plainText}
            onMouseUp={captureSelection}
            onTouchEnd={captureSelection}
            className="w-full min-h-[220px] h-[min(55vh,520px)] p-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm leading-relaxed resize outline-none selection:bg-purple-200 overflow-y-auto"
          />
          {errors.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setPreviewOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-purple-600"
              >
                {previewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Предпросмотр пометок ({errors.length})
              </button>
              {previewOpen && (
                <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100 leading-relaxed whitespace-pre-wrap text-sm max-h-[160px] overflow-y-auto custom-scrollbar">
                  {segments.map((seg, idx) =>
                    seg.annotation ? (
                      <mark
                        key={`${idx}-${seg.annotation.id}`}
                        className={`${kindColor(seg.annotation.kind)} border-b-2 px-0.5`}
                        title={seg.annotation.message}
                      >
                        {seg.text}
                      </mark>
                    ) : (
                      <span key={idx}>{seg.text}</span>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ESSAY_ERROR_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setSelectedKind(k.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                  selectedKind === k.id ? k.color + ' ring-1 ring-offset-1 ring-purple-300' : 'border-gray-200 text-gray-500'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          {selection && (
            <div className="mt-2 p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-xs">
              <span className="font-black text-purple-700">Выделено:</span>{' '}
              <span className="italic">«{selection.text.slice(0, 80)}{selection.text.length > 80 ? '…' : ''}»</span>
            </div>
          )}
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              placeholder="Комментарий к ошибке…"
              className="flex-1 p-2.5 rounded-xl border-2 border-gray-200 outline-none focus:border-purple-400 text-sm font-medium"
            />
            <button
              type="button"
              onClick={addError}
              disabled={!selection || !draftMessage.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Добавить
            </button>
          </div>
        </div>

        <div className="bg-gray-900 text-white rounded-2xl p-4 flex flex-col max-h-[320px]">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <ArrowRight className="w-3 h-3" /> Ошибки ({errors.length})
          </p>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {errors.length === 0 && (
              <p className="text-xs text-gray-500 font-medium">Выделите слово или фразу и добавьте замечание.</p>
            )}
            {errors.map((err, idx) => (
              <div key={err.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${kindColor(err.kind)}`}>
                    {idx + 1}. {kindLabel(err.kind)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setErrors((prev) => prev.filter((e) => e.id !== err.id))}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {err.snippet && <p className="text-[11px] text-purple-200 italic mb-0.5">«{err.snippet}»</p>}
                <p className="text-xs font-medium text-gray-200">{err.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6 bg-gray-900 text-white rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Балл</label>
            <ScoreField
              value={score}
              max={maxScore}
              onChange={setScore}
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl p-3 text-2xl font-black outline-none focus:border-purple-500 text-center text-white"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Комментарий
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Общий фидбек по ответу…"
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl p-3 text-sm outline-none focus:border-purple-500 text-white font-medium resize-none min-h-[64px]"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => onRevision(comment)}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2"
          >
            <AlertCircle className="w-4 h-4" /> На доработку
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-7 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isGraded ? 'Сохранить оценку' : `Выставить ${score} баллов`}
          </button>
        </div>
      </div>

      <FullscreenTextReader
        text={plainText}
        title="Ответ ученика"
        isOpen={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
      />
    </div>
  );
}
