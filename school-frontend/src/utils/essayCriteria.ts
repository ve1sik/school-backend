/** Критерии оценивания сочинений */

export type EssayCriterionId = string;

export type EssayCriteriaKind = 'ege' | 'final';

export type EssayCriterionDef = {
  id: EssayCriterionId;
  label: string;
  shortLabel: string;
  maxScore: number;
  hint: string;
};

export type EssayCriterionScore = {
  id: EssayCriterionId;
  label: string;
  maxScore: number;
  score: number;
  comment: string;
};

/** Сочинение ЕГЭ (задание 27) — 22 балла */
export const EGE_ESSAY_CRITERIA: EssayCriterionDef[] = [
  {
    id: 'K1',
    label: 'K1 — Отражение позиции автора по проблеме исходного текста',
    shortLabel: 'Позиция автора',
    maxScore: 1,
    hint: 'Верно определена позиция автора по проблеме.',
  },
  {
    id: 'K2',
    label: 'K2 — Комментарий к позиции автора',
    shortLabel: 'Комментарий',
    maxScore: 3,
    hint: 'Комментарий с опорой на текст, примеры и пояснения.',
  },
  {
    id: 'K3',
    label: 'K3 — Отношение к позиции автора',
    shortLabel: 'Своё мнение',
    maxScore: 2,
    hint: 'Сформулировано собственное отношение к позиции автора.',
  },
  {
    id: 'K4',
    label: 'K4 — Фактическая точность речи',
    shortLabel: 'Фактическая точность',
    maxScore: 1,
    hint: 'Нет фактических ошибок в речи.',
  },
  {
    id: 'K5',
    label: 'K5 — Логичность речи',
    shortLabel: 'Логичность',
    maxScore: 2,
    hint: 'Нет логических ошибок и нарушений последовательности.',
  },
  {
    id: 'K6',
    label: 'K6 — Соблюдение этических норм',
    shortLabel: 'Этика',
    maxScore: 1,
    hint: 'Соблюдены этические нормы изложения.',
  },
  {
    id: 'K7',
    label: 'K7 — Соблюдение орфографических норм',
    shortLabel: 'Орфография',
    maxScore: 3,
    hint: 'Орфографические ошибки не допускаются или минимальны.',
  },
  {
    id: 'K8',
    label: 'K8 — Соблюдение пунктуационных норм',
    shortLabel: 'Пунктуация',
    maxScore: 3,
    hint: 'Пунктуационные ошибки, в т.ч. при причастных оборотах.',
  },
  {
    id: 'K9',
    label: 'K9 — Соблюдение грамматических норм',
    shortLabel: 'Грамматика',
    maxScore: 3,
    hint: 'Грамматические ошибки (спряжение, согласование и др.).',
  },
  {
    id: 'K10',
    label: 'K10 — Соблюдение речевых норм',
    shortLabel: 'Речевые нормы',
    maxScore: 3,
    hint: 'Нет нарушений речевых норм.',
  },
];

/** Итоговое сочинение — 5 критериев */
export const FINAL_ESSAY_CRITERIA: EssayCriterionDef[] = [
  {
    id: 'K1',
    label: 'K1 — Соответствие теме',
    shortLabel: 'Тема',
    maxScore: 3,
    hint: 'Сочинение соответствует заданной теме.',
  },
  {
    id: 'K2',
    label: 'K2 — Аргументация. Привлечение литературного материала',
    shortLabel: 'Аргументация',
    maxScore: 6,
    hint: 'Убедительная аргументация с примерами из литературы.',
  },
  {
    id: 'K3',
    label: 'K3 — Композиция и логика рассуждения',
    shortLabel: 'Композиция',
    maxScore: 6,
    hint: 'Логичная композиция, связность частей.',
  },
  {
    id: 'K4',
    label: 'K4 — Качество письменной речи',
    shortLabel: 'Качество речи',
    maxScore: 4,
    hint: 'Точность, выразительность, стиль.',
  },
  {
    id: 'K5',
    label: 'K5 — Грамотность',
    shortLabel: 'Грамотность',
    maxScore: 11,
    hint: 'Орфография, пунктуация, грамматика и речевые нормы.',
  },
];

export const EGE_ESSAY_MAX_SCORE = EGE_ESSAY_CRITERIA.reduce((s, c) => s + c.maxScore, 0);
export const FINAL_ESSAY_MAX_SCORE = FINAL_ESSAY_CRITERIA.reduce((s, c) => s + c.maxScore, 0);

export function criteriaKindFromBlockType(blockType?: string | null): EssayCriteriaKind {
  if (blockType === 'essay_final') return 'final';
  return 'ege';
}

export function getCriteriaDefs(kind: EssayCriteriaKind): EssayCriterionDef[] {
  return kind === 'final' ? FINAL_ESSAY_CRITERIA : EGE_ESSAY_CRITERIA;
}

export function getMaxScoreForKind(kind: EssayCriteriaKind): number {
  return kind === 'final' ? FINAL_ESSAY_MAX_SCORE : EGE_ESSAY_MAX_SCORE;
}

export function buildEmptyCriteriaScores(kind: EssayCriteriaKind = 'ege'): EssayCriterionScore[] {
  return getCriteriaDefs(kind).map((c) => ({
    id: c.id,
    label: c.label,
    maxScore: c.maxScore,
    score: 0,
    comment: '',
  }));
}

export function normalizeCriteriaScores(raw: unknown, kind: EssayCriteriaKind = 'ege'): EssayCriterionScore[] {
  const base = buildEmptyCriteriaScores(kind);
  if (!Array.isArray(raw)) return base;
  return base.map((row) => {
    const found = raw.find((r: any) => r?.id === row.id);
    if (!found) return row;
    const score = Math.min(row.maxScore, Math.max(0, Number(found.score) || 0));
    return {
      ...row,
      score,
      comment: String(found.comment || ''),
    };
  });
}

export function sumCriteriaScores(rows: EssayCriterionScore[]): number {
  return rows.reduce((s, r) => s + (Number(r.score) || 0), 0);
}

export function formatCriterionScore(row: EssayCriterionScore): string {
  return `${row.id}: ${row.score} из ${row.maxScore}`;
}

export function detectCriteriaKindFromSubmission(sub: any): EssayCriteriaKind {
  if (sub?.blockType === 'essay_final') return 'final';
  if (sub?.block_type === 'essay_final') return 'final';
  const max = Number(sub?.maxScore ?? sub?.max_score);
  if (max === FINAL_ESSAY_MAX_SCORE) return 'final';
  if (Array.isArray(sub?.criteriaScores) || Array.isArray(sub?.criteria_scores)) {
    const arr = sub.criteriaScores || sub.criteria_scores;
    if (Array.isArray(arr) && arr.length <= 5) return 'final';
  }
  return 'ege';
}
