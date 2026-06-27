import { EGE_ESSAY_CRITERIA, normalizeCriteriaScores, sumCriteriaScores, type EssayCriterionScore } from '../utils/essayCriteria';
import {
  buildAnnotatedSegments,
  kindColor,
  kindLabel,
  normalizeErrorAnnotations,
  stripHtmlToPlain,
} from '../utils/essayErrors';

type Props = {
  answer: string;
  score: number;
  maxScore: number;
  comment?: string;
  criteriaScores?: unknown;
  errorAnnotations?: unknown;
};

export default function EssayResultView({
  answer,
  score,
  maxScore,
  comment,
  criteriaScores,
  errorAnnotations,
}: Props) {
  const plain = stripHtmlToPlain(answer);
  const criteria = normalizeCriteriaScores(criteriaScores);
  const errors = normalizeErrorAnnotations(errorAnnotations);
  const segments = buildAnnotatedSegments(plain, errors);
  const hasCriteria = criteria.some((c) => c.score > 0 || c.comment.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200">
        <span className="font-black text-emerald-800 text-lg">Итоговый балл за сочинение</span>
        <span className="text-3xl font-black text-emerald-600">
          {score} <span className="text-lg text-emerald-400">/ {maxScore}</span>
        </span>
      </div>

      {errors.length > 0 && (
        <div className="grid lg:grid-cols-[1fr_280px] gap-4">
          <div className="p-4 rounded-2xl bg-white border border-gray-100 font-serif leading-relaxed whitespace-pre-wrap">
            {segments.map((seg, idx) =>
              seg.annotation ? (
                <mark
                  key={`${idx}-${seg.annotation.id}`}
                  className={`${kindColor(seg.annotation.kind)} border-b-2 px-0.5 rounded-sm`}
                  title={seg.annotation.message}
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={idx}>{seg.text}</span>
              ),
            )}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Замечания</p>
            {errors.map((err, idx) => (
              <div key={err.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${kindColor(err.kind)}`}>
                  {idx + 1}. {kindLabel(err.kind)}
                </span>
                {err.snippet && <p className="italic text-gray-500 mt-1 text-xs">«{err.snippet}»</p>}
                <p className="mt-1 font-medium text-gray-800">{err.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasCriteria && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
            <p className="font-black text-purple-900">Баллы по критериям</p>
          </div>
          <div className="divide-y divide-gray-100">
            {criteria.map((row) => (
              <CriterionRow key={row.id} row={row} />
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 text-right text-sm font-black text-gray-600">
            Сумма: {sumCriteriaScores(criteria)} / {maxScore}
          </div>
        </div>
      )}

      {comment && (
        <div className="p-4 bg-white rounded-xl border border-emerald-100 text-sm text-gray-800">
          <strong className="text-emerald-700 block mb-1 uppercase tracking-wider text-[11px]">
            Комментарий куратора
          </strong>
          {comment}
        </div>
      )}
    </div>
  );
}

function CriterionRow({ row }: { row: EssayCriterionScore }) {
  const def = EGE_ESSAY_CRITERIA.find((c) => c.id === row.id);
  return (
    <div className="px-4 py-3 grid sm:grid-cols-[1fr_auto] gap-2 items-start">
      <div>
        <p className="font-bold text-gray-900 text-sm">{def?.shortLabel || row.id}</p>
        {row.comment && <p className="text-xs text-gray-500 mt-1">{row.comment}</p>}
      </div>
      <div className="font-black text-purple-600 text-lg whitespace-nowrap">
        {row.score} / {row.maxScore}
      </div>
    </div>
  );
}
