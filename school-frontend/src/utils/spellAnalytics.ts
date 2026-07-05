import { checkSpelling } from './spellCheck';
import { normalizeErrorAnnotations } from './essayErrors';
import {
  SPELL_RULES,
  buildSpellRuleRecommendation,
  classifySpellRuleFromText,
  normalizeSpellRuleId,
  type SpellRuleId,
  type SpellRuleRecommendation,
  type SpellRuleStat,
} from './spellRules';

type BlockMeta = {
  id: string;
  type?: string;
  title?: string;
  spellRule?: string | null;
  pairs?: Array<{ left?: string; right?: string; spellRule?: string | null }>;
};

function parseBlocksMeta(lesson: any): BlockMeta[] {
  if (Array.isArray(lesson?.blocksMeta)) return lesson.blocksMeta;
  try {
    const parsed = JSON.parse(lesson?.content || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((b: any) => ({
      id: String(b.id),
      type: b.type,
      title: b.title,
      spellRule: b.spellRule || null,
      pairs: b.pairs?.map((p: any) => ({
        left: p.left,
        right: p.right,
        spellRule: p.spellRule || null,
      })),
    }));
  } catch {
    return [];
  }
}

function parseMatchingAnswer(answer: string): Record<string, string> {
  const map: Record<string, string> = {};
  (answer || '').split(',').forEach((chunk) => {
    const part = chunk.trim();
    if (!part) return;
    const sep = part.includes(' - ') ? ' - ' : part.includes('|||') ? '|||' : null;
    if (!sep) return;
    const [left, right] = part.split(sep);
    if (left) map[left.trim()] = (right || '').trim();
  });
  return map;
}

function isFailedSubmission(sub: any): boolean {
  if (sub.status === 'REVISION') return true;
  if (sub.status !== 'GRADED') return false;
  const score = Number(sub.score);
  const max = Number(sub.max_score) || 0;
  if (Number.isFinite(score) && max > 0 && score < max) return true;
  if (score === 0) return true;
  const comment = String(sub.comment || '');
  return comment.includes('Неверно') || comment.includes('🤖');
}

function taskLabel(lesson: any, block: BlockMeta | undefined, sub: any): string {
  const blockTitle = block?.title || sub.question || 'Задание';
  const plain = String(blockTitle).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return `${lesson.title}: ${plain.slice(0, 60)}`;
}

function bump(
  counts: Map<SpellRuleId, { count: number; examples: Set<string> }>,
  ruleId: SpellRuleId,
  example: string,
) {
  const row = counts.get(ruleId) || { count: 0, examples: new Set<string>() };
  row.count += 1;
  if (example) row.examples.add(example);
  counts.set(ruleId, row);
}

function ruleFromBlock(block: BlockMeta | undefined, pairIndex?: number): SpellRuleId | null {
  if (!block) return null;
  if (pairIndex != null && block.pairs?.[pairIndex]) {
    return normalizeSpellRuleId(block.pairs[pairIndex].spellRule);
  }
  return normalizeSpellRuleId(block.spellRule);
}

function ruleFromAnnotation(ann: { kind?: string; message?: string; snippet?: string }, blockRule: SpellRuleId | null): SpellRuleId {
  if (blockRule) return blockRule;
  const msg = `${ann.message || ''} ${ann.snippet || ''}`.toLowerCase();
  if (ann.kind === 'punctuation') {
    if (msg.includes('дееприч')) return 'punctuation_deverbative';
    if (msg.includes('причаст')) return 'punctuation_participle';
    return 'punctuation_general';
  }
  if (ann.kind === 'grammar') return classifySpellRuleFromText(msg);
  return classifySpellRuleFromText(msg);
}

function collectFromSubmission(
  sub: any,
  block: BlockMeta | undefined,
  lesson: any,
  counts: Map<SpellRuleId, { count: number; examples: Set<string> }>,
) {
  const example = taskLabel(lesson, block, sub);
  const answer = String(sub.answer || '');
  const blockRule = ruleFromBlock(block);

  const curatorMarks = normalizeErrorAnnotations(sub.errorAnnotations || sub.error_annotations);
  if (curatorMarks.length > 0) {
    curatorMarks.forEach((ann) => {
      bump(counts, ruleFromAnnotation(ann, blockRule), `${example}: «${ann.snippet || ann.message}»`);
    });
    return;
  }

  if (block?.type === 'matching' && block.pairs?.length) {
    const userMap = parseMatchingAnswer(answer);
    block.pairs.forEach((pair, idx) => {
      if (!pair.left) return;
      const student = (userMap[pair.left] || '').toLowerCase().replace(/ё/g, 'е').trim();
      const right = String(pair.right || '').toLowerCase().replace(/ё/g, 'е').trim();
      if (!right || student === right) return;
      const ruleId = ruleFromBlock(block, idx) || 'other';
      bump(counts, ruleId, example);
    });
    return;
  }

  const spellErrors = checkSpelling(answer);
  if (spellErrors.length > 0) {
    spellErrors.forEach((err) => {
      bump(counts, err.ruleId, `${example}: «${err.word}»`);
    });
    return;
  }

  const blockRuleAfter = ruleFromBlock(block);
  if (isFailedSubmission(sub) && blockRuleAfter) {
    bump(counts, blockRuleAfter, example);
  }
}

export function collectSpellRuleStats(
  course: any,
  mySubs: any[],
  themeId?: string,
): SpellRuleStat[] {
  const counts = new Map<SpellRuleId, { count: number; examples: Set<string> }>();
  const blockIndex = new Map<string, { lesson: any; theme: any; block: BlockMeta }>();

  course?.themes?.forEach((theme: any) => {
    if (themeId && theme.id !== themeId) return;
    theme.lessons?.forEach((lesson: any) => {
      if (lesson.include_in_analytics === false) return;
      parseBlocksMeta(lesson).forEach((block) => {
        blockIndex.set(`${lesson.id}:${block.id}`, { lesson, theme, block });
      });
    });
  });

  const latestByBlock = new Map<string, any>();
  mySubs.forEach((sub) => {
    const lessonId = sub.lesson_id || sub.lessonId;
    const blockId = String(sub.block_id || sub.blockId || '');
    if (!lessonId || !blockId) return;
    const key = `${lessonId}:${blockId}`;
    if (!blockIndex.has(key)) return;
    const existing = latestByBlock.get(key);
    if (!existing) {
      latestByBlock.set(key, sub);
      return;
    }
    const subTs = new Date(sub.updated_at || sub.created_at || 0).getTime();
    const exTs = new Date(existing.updated_at || existing.created_at || 0).getTime();
    if (subTs > exTs) latestByBlock.set(key, sub);
  });

  latestByBlock.forEach((sub, key) => {
    const meta = blockIndex.get(key);
    if (!meta) return;
    collectFromSubmission(sub, meta.block, meta.lesson, counts);
  });

  return (Object.keys(SPELL_RULES) as SpellRuleId[])
    .map((ruleId) => {
      const row = counts.get(ruleId);
      if (!row?.count) return null;
      const info = SPELL_RULES[ruleId];
      return {
        ruleId,
        label: info.label,
        shortLabel: info.shortLabel,
        review: info.review,
        group: info.group,
        errorCount: row.count,
        taskExamples: [...row.examples].slice(0, 5),
      } satisfies SpellRuleStat;
    })
    .filter(Boolean) as SpellRuleStat[];
}

export function getSpellRuleRecommendation(
  course: any,
  mySubs: any[],
  themeId?: string,
): SpellRuleRecommendation {
  const stats = collectSpellRuleStats(course, mySubs, themeId);
  return buildSpellRuleRecommendation(stats);
}
