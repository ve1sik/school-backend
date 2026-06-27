/** Категории орфографии, грамматики и пунктуации (ЕГЭ‑9, 10, 11 и др.) */

export type SpellRuleId =
  | 'pre_pri'
  | 'i_y_after_prefix'
  | 'z_s_after_prefix'
  | 'conjugation'
  | 'hyphenation'
  | 'particles_tomo'
  | 'vocabulary'
  | 'punctuation_participle'
  | 'punctuation_general'
  | 'other';

export type SpellRuleInfo = {
  id: SpellRuleId;
  label: string;
  shortLabel: string;
  review: string;
  group: 'orthography' | 'grammar' | 'punctuation';
};

export const SPELL_RULES: Record<SpellRuleId, SpellRuleInfo> = {
  pre_pri: {
    id: 'pre_pri',
    label: 'Приставки пре- / при-',
    shortLabel: 'пре- / при-',
    review: 'Повторите правила написания приставок пре- и при-.',
    group: 'orthography',
  },
  i_y_after_prefix: {
    id: 'i_y_after_prefix',
    label: 'И и Ы после приставок',
    shortLabel: 'и / ы',
    review: 'Повторите правило: после приставок, как правило, пишется и, а не ы.',
    group: 'orthography',
  },
  z_s_after_prefix: {
    id: 'z_s_after_prefix',
    label: 'З и С на конце приставок',
    shortLabel: 'з / с',
    review: 'Повторите правила написания з и с на конце приставок (без-/бес-, воз-/вос- и др.).',
    group: 'orthography',
  },
  conjugation: {
    id: 'conjugation',
    label: 'Спряжение глаголов',
    shortLabel: 'спряжение',
    review: 'Повторите спряжение глаголов — личные окончания, особенно в формах прошедшего времени.',
    group: 'grammar',
  },
  hyphenation: {
    id: 'hyphenation',
    label: 'Слитно, раздельно, дефис',
    shortLabel: 'слитно-разд.',
    review: 'Повторите правила слитного, раздельного и дефисного написания.',
    group: 'orthography',
  },
  particles_tomo: {
    id: 'particles_tomo',
    label: 'Частицы -то, -либо, -нибудь (тем-то, том-то…)',
    shortLabel: 'тем-то / том-то',
    review: 'Повторите написание частиц и местоимений с -то, -либо, -нибудь (тем-то, том-то, когда-нибудь).',
    group: 'orthography',
  },
  vocabulary: {
    id: 'vocabulary',
    label: 'Словарные слова',
    shortLabel: 'словарь',
    review: 'Подтяните словарные слова — повторите написания, где чаще всего ошибались.',
    group: 'orthography',
  },
  punctuation_participle: {
    id: 'punctuation_participle',
    label: 'Пунктуация: причастный оборот',
    shortLabel: 'прич. оборот',
    review: 'Повторите правила постановки запятых при причастном обороте.',
    group: 'punctuation',
  },
  punctuation_general: {
    id: 'punctuation_general',
    label: 'Пунктуация (общие правила)',
    shortLabel: 'пунктуация',
    review: 'Повторите общие правила пунктуации — однородные члены, вводные слова, сложные предложения.',
    group: 'punctuation',
  },
  other: {
    id: 'other',
    label: 'Другие правила',
    shortLabel: 'прочее',
    review: 'Повторите правила, в которых чаще всего допускали ошибки.',
    group: 'orthography',
  },
};

export const SPELL_RULE_OPTIONS: SpellRuleInfo[] = Object.values(SPELL_RULES);

export function normalizeSpellRuleId(value: unknown): SpellRuleId | null {
  if (typeof value !== 'string') return null;
  return value in SPELL_RULES ? (value as SpellRuleId) : null;
}

/** Угадываем правило по тексту подсказки */
export function classifySpellRuleFromText(ruleText: string): SpellRuleId {
  const t = (ruleText || '').toLowerCase();
  if (t.includes('причаст')) return 'punctuation_participle';
  if (t.includes('пунктуац') || t.includes('запят')) return 'punctuation_general';
  if (t.includes('спряж')) return 'conjugation';
  if (t.includes('слитн') || t.includes('раздельн') || t.includes('дефис')) return 'hyphenation';
  if (t.includes('тем-то') || t.includes('том-то') || t.includes('частиц')) return 'particles_tomo';
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
  group: 'orthography' | 'grammar' | 'punctuation';
  errorCount: number;
  taskExamples: string[];
};

export type SpellRuleRecommendation = {
  summary: string;
  topRule: SpellRuleStat | null;
  stats: SpellRuleStat[];
  totalErrors: number;
  byGroup: {
    orthography: number;
    grammar: number;
    punctuation: number;
  };
};

export function buildSpellRuleRecommendation(stats: SpellRuleStat[]): SpellRuleRecommendation {
  const sorted = [...stats].filter((s) => s.errorCount > 0).sort((a, b) => b.errorCount - a.errorCount);
  const totalErrors = sorted.reduce((sum, s) => sum + s.errorCount, 0);
  const byGroup = {
    orthography: sorted.filter((s) => s.group === 'orthography').reduce((n, s) => n + s.errorCount, 0),
    grammar: sorted.filter((s) => s.group === 'grammar').reduce((n, s) => n + s.errorCount, 0),
    punctuation: sorted.filter((s) => s.group === 'punctuation').reduce((n, s) => n + s.errorCount, 0),
  };

  if (!sorted.length) {
    return {
      summary: 'По этому курсу ошибок по правилам пока не накопилось.',
      topRule: null,
      stats: [],
      totalErrors: 0,
      byGroup,
    };
  }

  const top = sorted[0];
  let summary = `Вы допустили ошибки в разных заданиях, но чаще всего — в правиле «${top.label}» (${top.errorCount} из ${totalErrors}). ${top.review}`;

  const others = sorted.slice(1);
  if (others.length > 0) {
    const also = others
      .slice(0, 2)
      .map((s) => `«${s.shortLabel}» (${s.errorCount})`)
      .join(', ');
    summary += ` Также обратите внимание на ${also}.`;
  }

  if (byGroup.punctuation > 0) {
    summary += ` Пунктуационных ошибок: ${byGroup.punctuation}.`;
  }

  return { summary, topRule: top, stats: sorted, totalErrors, byGroup };
}
