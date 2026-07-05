import type { SpellRuleId } from './spellRules';
import { SPELL_RULES } from './spellRules';

export interface SpellError {
  word: string;
  suggestion: string;
  rule: string;
  ruleId: SpellRuleId;
}

type DictRow = [wrong: string, correct: string, ruleId: SpellRuleId, hint: string];

const DICT: DictRow[] = [
  ['вареньи', 'варенье', 'vocabulary', ''],
  ['сабака', 'собака', 'vocabulary', ''],
  ['малоко', 'молоко', 'vocabulary', ''],
  ['превилегия', 'привилегия', 'vocabulary', ''],
  ['прикрасный', 'прекрасный', 'pre_pri', ''],
  ['приграда', 'преграда', 'pre_pri', ''],
  ['приемущество', 'преимущество', 'pre_pri', ''],
  ['преобрести', 'приобрести', 'pre_pri', ''],
  ['приодолеть', 'преодолеть', 'pre_pri', ''],
  ['преступить', 'приступить', 'pre_pri', ''],
  ['привышение', 'превышение', 'pre_pri', ''],
  ['отросыль', 'отрасль', 'alternating_roots', ''],
  ['вырощу', 'выращу', 'alternating_roots', ''],
  ['пологать', 'полагать', 'alternating_roots', ''],
  ['голубиный', 'голубинный', 'double_consonants', ''],
  ['деревяной', 'деревянный', 'double_consonants', ''],
  ['класный', 'классный', 'double_consonants', ''],
  ['каменый', 'каменный', 'double_consonants', ''],
  ['блистящий', 'блестящий', 'root_vowel', ''],
  ['гарантиа', 'гарантия', 'root_vowel', ''],
  ['пишится', 'пишется', 'conjugation', ''],
  ['не смотря', 'несмотря', 'hyphenation', ''],
  ['вообщем', 'в общем', 'hyphenation', ''],
];

const LOOKUP = new Map<string, DictRow>();
for (const entry of DICT) {
  const [wrong, correct] = entry;
  if (wrong !== correct) LOOKUP.set(wrong.toLowerCase(), entry);
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[а-яё]+/gi) || [];
}

export function stripHtmlForSpellCheck(html: string): string {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkSpelling(text: string): SpellError[] {
  const plain = text.includes('<') ? stripHtmlForSpellCheck(text) : text;
  if (!plain || plain.trim().length < 3) return [];

  const errors: SpellError[] = [];
  const seen = new Set<string>();

  for (const word of tokenize(plain)) {
    if (seen.has(word)) continue;
    seen.add(word);
    const hit = LOOKUP.get(word);
    if (!hit) continue;
    const [wrong, correct, ruleId, hintText] = hit;
    errors.push({
      word: wrong,
      suggestion: correct,
      ruleId,
      rule: hintText || SPELL_RULES[ruleId].label,
    });
  }

  const phrase = plain.toLowerCase();
  if (phrase.includes('не смотря') && !seen.has('не')) {
    errors.push({
      word: 'не смотря',
      suggestion: 'несмотря',
      ruleId: 'hyphenation',
      rule: SPELL_RULES.hyphenation.label,
    });
  }

  return errors;
}

export function highlightErrors(text: string, errors: SpellError[]): string {
  if (!errors.length) return text;
  let result = text;
  for (const err of errors) {
    const regex = new RegExp(err.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, `<mark class="bg-rose-100 text-rose-700 rounded px-0.5">${err.word}</mark>`);
  }
  return result;
}
