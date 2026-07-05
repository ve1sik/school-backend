/** Категории орфографии, грамматики и пунктуации (ЕГЭ) */

export type SpellRuleId =
  | 'pre_pri'
  | 'i_y_after_prefix'
  | 'z_s_after_prefix'
  | 'alternating_roots'
  | 'double_consonants'
  | 'root_vowel'
  | 'conjugation'
  | 'hyphenation'
  | 'particles_tomo'
  | 'vocabulary'
  | 'punctuation_participle'
  | 'punctuation_deverbative'
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
    label: 'Приставки пре- / при- (разное значение)',
    shortLabel: 'пре- / при-',
    review:
      'Повторите пары вроде прекрасный / прикрасный, преобразовать / приобрести — когда меняется смысл слова.',
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
  alternating_roots: {
    id: 'alternating_roots',
    label: 'Чередующиеся корни',
    shortLabel: 'корни',
    review: 'Повторите чередование корней: раст/рос/ращ, лаг/лож, бер/бир, кас/кос и др.',
    group: 'orthography',
  },
  double_consonants: {
    id: 'double_consonants',
    label: 'Удвоенные согласные',
    shortLabel: 'удвоение',
    review: 'Повторите написание слов с удвоенными согласными: голубинный, деревянный, классный и др.',
    group: 'orthography',
  },
  root_vowel: {
    id: 'root_vowel',
    label: 'Гласные в корне (ударение, проверяемые)',
    shortLabel: 'гласные',
    review: 'Повторите безударные гласные в корне и слова-исключения (гарантия, блестящий и др.).',
    group: 'orthography',
  },
  conjugation: {
    id: 'conjugation',
    label: 'Спряжение глаголов',
    shortLabel: 'спряжение',
    review: 'Повторите спряжение — личные окончания и формы глаголов (задание 12).',
    group: 'grammar',
  },
  hyphenation: {
    id: 'hyphenation',
    label: 'Слитно, раздельно, дефис',
    shortLabel: 'слитно-разд.',
    review: 'Повторите правила слитного, раздельного и дефисного написания (задание 12).',
    group: 'orthography',
  },
  particles_tomo: {
    id: 'particles_tomo',
    label: 'Частицы -то, -либо, -нибудь',
    shortLabel: 'тем-то / том-то',
    review: 'Повторите написание частиц и местоимений с -то, -либо, -нибудь.',
    group: 'orthography',
  },
  vocabulary: {
    id: 'vocabulary',
    label: 'Словарные слова и исключения',
    shortLabel: 'словарь',
    review: 'Подтяните словарные слова и исключения — повторите написания, где чаще всего ошибались.',
    group: 'orthography',
  },
  punctuation_participle: {
    id: 'punctuation_participle',
    label: 'Пунктуация: причастный оборот',
    shortLabel: 'прич. оборот',
    review: 'Повторите правила постановки запятых при причастном обороте.',
    group: 'punctuation',
  },
  punctuation_deverbative: {
    id: 'punctuation_deverbative',
    label: 'Пунктуация: деепричастный оборот',
    shortLabel: 'дееприч.',
    review: 'Повторите правила постановки запятых при деепричастном обороте.',
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
    review: 'Повторите темы, в которых чаще всего допускали ошибки.',
    group: 'orthography',
  },
};

export const SPELL_RULE_OPTIONS: SpellRuleInfo[] = Object.values(SPELL_RULES);

export const SPELL_RULE_GROUPS: Array<{ title: string; ids: SpellRuleId[] }> = [
  {
    title: 'Орфография',
    ids: [
      'pre_pri',
      'alternating_roots',
      'double_consonants',
      'root_vowel',
      'i_y_after_prefix',
      'z_s_after_prefix',
      'vocabulary',
      'hyphenation',
      'particles_tomo',
    ],
  },
  {
    title: 'Грамматика',
    ids: ['conjugation'],
  },
  {
    title: 'Пунктуация',
    ids: ['punctuation_participle', 'punctuation_deverbative', 'punctuation_general'],
  },
  { title: 'Прочее', ids: ['other'] },
];

export function normalizeSpellRuleId(value: unknown): SpellRuleId | null {
  if (typeof value !== 'string') return null;
  return value in SPELL_RULES ? (value as SpellRuleId) : null;
}

/** Угадываем правило по тексту подсказки куратора или автопроверки */
export function classifySpellRuleFromText(ruleText: string): SpellRuleId {
  const t = (ruleText || '').toLowerCase();
  if (t.includes('дееприч')) return 'punctuation_deverbative';
  if (t.includes('причаст')) return 'punctuation_participle';
  if (t.includes('пунктуац') || t.includes('запят')) return 'punctuation_general';
  if (t.includes('спряж')) return 'conjugation';
  if (t.includes('слитн') || t.includes('раздельн') || t.includes('дефис')) return 'hyphenation';
  if (t.includes('тем-то') || t.includes('том-то') || t.includes('частиц')) return 'particles_tomo';
  if (t.includes('черед') || t.includes('корн') || t.includes('раст') || t.includes('рос')) {
    return 'alternating_roots';
  }
  if (t.includes('удвоен') || t.includes('двойн') && t.includes('соглас')) return 'double_consonants';
  if (t.includes('гласн') || t.includes('ударен')) return 'root_vowel';
  if (
    (t.includes('приставк') || t.includes('пре-') || t.includes('при-')) &&
    (t.includes('значен') || t.includes('прекрас') || t.includes('преобраз') || t.includes('приобрет'))
  ) {
    return 'pre_pri';
  }
  if (t.includes(' и ') && t.includes('ы')) return 'i_y_after_prefix';
  if (t.includes('з') && t.includes('с') && t.includes('пристав')) return 'z_s_after_prefix';
  if (t.includes('словар') || t.includes('исключ')) return 'vocabulary';
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
  let summary = `Чаще всего ошибки в теме «${top.label}» — ${top.errorCount} из ${totalErrors}. ${top.review}`;

  const others = sorted.slice(1, 4);
  if (others.length > 0) {
    const also = others.map((s) => `«${s.shortLabel}» (${s.errorCount})`).join(', ');
    summary += ` Также стоит повторить: ${also}.`;
  }

  return { summary, topRule: top, stats: sorted, totalErrors, byGroup };
}
