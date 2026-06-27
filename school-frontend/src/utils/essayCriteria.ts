/** Критерии оценивания сочинения ЕГЭ по русскому языку (22 балла) */

export type EssayCriterionId =
  | 'K1'
  | 'K2'
  | 'K3'
  | 'K4'
  | 'K5'
  | 'K6'
  | 'K7'
  | 'K8'
  | 'K9'
  | 'K10';

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

export const EGE_ESSAY_CRITERIA: EssayCriterionDef[] = [
  {
    id: 'K1',
    label: 'K1 — Формулировка проблемы',
    shortLabel: 'Проблема',
    maxScore: 1,
    hint: 'Проблема сформулирована верно и соответствует тексту.',
  },
  {
    id: 'K2',
    label: 'K2 — Комментарий к проблеме',
    shortLabel: 'Комментарий',
    maxScore: 3,
    hint: 'Пояснение проблемы с опорой на текст, примеры и пояснения к ним.',
  },
  {
    id: 'K3',
    label: 'K3 — Позиция автора',
    shortLabel: 'Позиция автора',
    maxScore: 2,
    hint: 'Верно определена позиция автора по проблеме.',
  },
  {
    id: 'K4',
    label: 'K4 — Отношение к позиции автора',
    shortLabel: 'Своё мнение',
    maxScore: 1,
    hint: 'Сформулировано собственное отношение к позиции автора.',
  },
  {
    id: 'K5',
    label: 'K5 — Смысловая целостность и логика',
    shortLabel: 'Логика',
    maxScore: 2,
    hint: 'Нет логических ошибок, нарушений последовательности изложения.',
  },
  {
    id: 'K6',
    label: 'K6 — Точность и выразительность речи',
    shortLabel: 'Речь',
    maxScore: 2,
    hint: 'Нет речевых ошибок, текст выразителен.',
  },
  {
    id: 'K7',
    label: 'K7 — Орфография',
    shortLabel: 'Орфография',
    maxScore: 3,
    hint: 'Орфографические ошибки не допускаются или минимальны.',
  },
  {
    id: 'K8',
    label: 'K8 — Пунктуация',
    shortLabel: 'Пунктуация',
    maxScore: 3,
    hint: 'Пунктуационные ошибки, в т.ч. в причастных оборотах.',
  },
  {
    id: 'K9',
    label: 'K9 — Грамматика',
    shortLabel: 'Грамматика',
    maxScore: 3,
    hint: 'Грамматические ошибки (спряжение, согласование и др.).',
  },
  {
    id: 'K10',
    label: 'K10 — Речевые нормы',
    shortLabel: 'Речевые нормы',
    maxScore: 3,
    hint: 'Нет нарушений речевых норм, тавтологии, канцеляризмов.',
  },
];

export const EGE_ESSAY_MAX_SCORE = EGE_ESSAY_CRITERIA.reduce((s, c) => s + c.maxScore, 0);

export function buildEmptyCriteriaScores(): EssayCriterionScore[] {
  return EGE_ESSAY_CRITERIA.map((c) => ({
    id: c.id,
    label: c.label,
    maxScore: c.maxScore,
    score: 0,
    comment: '',
  }));
}

export function normalizeCriteriaScores(raw: unknown): EssayCriterionScore[] {
  const base = buildEmptyCriteriaScores();
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
