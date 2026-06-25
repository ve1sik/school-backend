/** Категории орфографических правил (ЕГЭ‑10 и др.) */

export type SpellRuleId =
  | 'pre_pri'
  | 'i_y_after_prefix'
  | 'z_s_after_prefix'
  | 'vocabulary'
  | 'other';

export type SpellRuleInfo = {
  id: SpellRuleId;
  label: string;
  shortLabel: string;
  review: string;
};

export const SPELL_RULES: Record<SpellRuleId, SpellRuleInfo> = {
  pre_pri: {
    id: 'pre_pri',
    label: 'Приставки пре- / при-',
    shortLabel: 'пре- / при-',
    review: 'Повторите правила написания приставок пре- и при-.',
  },
  i_y_after_prefix: {
    id: 'i_y_after_prefix',
    label: 'И и Ы после приставок',
    shortLabel: 'и / ы',
    review: 'Повторите правило: после приставок, как правило, пишется и, а не ы.',
  },
  z_s_after_prefix: {
    id: 'z_s_after_prefix',
    label: 'З и С на конце приставок',
    shortLabel: 'з / с',
    review: 'Повторите правила написания з и с на конце приставок (без-/бес-, воз-/вос- и др.).',
  },
  vocabulary: {
    id: 'vocabulary',
    label: 'Словарные слова',
    shortLabel: 'словарь',
    review: 'Подтяните словарные слова — повторите написания, где чаще всего ошибались.',
  },
  other: {
    id: 'other',
    label: 'Другие правила',
    shortLabel: 'прочее',
    review: 'Повторите правила, в которых чаще всего допускали ошибки.',
  },
};

export const SPELL_RULE_OPTIONS: SpellRuleInfo[] = Object.values(SPELL_RULES);

export function normalizeSpellRuleId(value: unknown): SpellRuleId | null {
  if (typeof value !== 'string') return null;
  return value in SPELL_RULES ? (value as SpellRuleId) : null;
}

/** Угадываем правило по тексту подсказки из spellCheck */
export function classifySpellRuleFromText(ruleText: string): SpellRuleId {
  const t = (ruleText || '').toLowerCase();
  if (t.includes('приставк') && (t.includes('пре') || t.includes('при-'))) return 'pre_pri';
  if (t.includes(' и ') && t.includes('ы')) return 'i_y_after_prefix';
  if (t.includes('з') && t.includes('с') && t.includes('пристав')) return 'z_s_after_prefix';
  if (t.includes('словар')) return 'vocabulary';
  return 'other';
}

export type SpellRuleStat = {
  ruleId: SpellRuleId;
  label: string;
  shortLabel: string;
  review: string;
  errorCount: number;
  taskExamples: string[];
};

export type SpellRuleRecommendation = {
  summary: string;
  topRule: SpellRuleStat | null;
  stats: SpellRuleStat[];
  totalErrors: number;
};

export function buildSpellRuleRecommendation(stats: SpellRuleStat[]): SpellRuleRecommendation {
  const sorted = [...stats].filter((s) => s.errorCount > 0).sort((a, b) => b.errorCount - a.errorCount);
  const totalErrors = sorted.reduce((sum, s) => sum + s.errorCount, 0);

  if (!sorted.length) {
    return {
      summary: 'По этому курсу ошибок по орфографическим правилам пока не накопилось.',
      topRule: null,
      stats: [],
      totalErrors: 0,
    };
  }

  const top = sorted[0];
  const others = sorted.slice(1);
  let summary = `Вы допустили ошибки в разных заданиях, но чаще всего — в правиле «${top.label}» (${top.errorCount} из ${totalErrors}). ${top.review}`;

  if (others.length > 0) {
    const also = others
      .slice(0, 2)
      .map((s) => `«${s.shortLabel}» (${s.errorCount})`)
      .join(', ');
    summary += ` Также обратите внимание на ${also}.`;
  }

  return { summary, topRule: top, stats: sorted, totalErrors };
}
