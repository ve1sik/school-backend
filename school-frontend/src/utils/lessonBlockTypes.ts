export const MANUAL_GRADE_BLOCK_TYPES = new Set(['written', 'homework', 'essay', 'essay_final']);
export const UNLIMITED_ATTEMPT_TYPES = new Set(['written', 'homework', 'essay', 'essay_final']);
export const INTERACTIVE_BLOCK_TYPES = ['test', 'test_short', 'written', 'matching', 'essay', 'essay_final'] as const;

export function isManualGradeBlock(type?: string): boolean {
  return MANUAL_GRADE_BLOCK_TYPES.has(type || '');
}

export function isUnlimitedAttempts(type?: string): boolean {
  return UNLIMITED_ATTEMPT_TYPES.has(type || '');
}

export function isInteractiveBlock(type?: string): boolean {
  return INTERACTIVE_BLOCK_TYPES.includes(type as (typeof INTERACTIVE_BLOCK_TYPES)[number]);
}
