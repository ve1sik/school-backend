/** Пометки ошибок в сочинении (куратор) */

export type EssayErrorKind = 'orthography' | 'grammar' | 'punctuation' | 'speech' | 'logic';

export type EssayErrorAnnotation = {
  id: string;
  start: number;
  end: number;
  kind: EssayErrorKind;
  message: string;
  snippet?: string;
};

export const ESSAY_ERROR_KINDS: Array<{ id: EssayErrorKind; label: string; color: string }> = [
  { id: 'orthography', label: 'Орфография', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'grammar', label: 'Грамматика', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'punctuation', label: 'Пунктуация', color: 'bg-sky-100 text-sky-900 border-sky-300' },
  { id: 'speech', label: 'Речь', color: 'bg-violet-100 text-violet-900 border-violet-300' },
  { id: 'logic', label: 'Логика / смысл', color: 'bg-orange-100 text-orange-900 border-orange-300' },
];

export function kindLabel(kind: EssayErrorKind): string {
  return ESSAY_ERROR_KINDS.find((k) => k.id === kind)?.label || kind;
}

export function kindColor(kind: EssayErrorKind): string {
  return ESSAY_ERROR_KINDS.find((k) => k.id === kind)?.color || 'bg-gray-100 text-gray-800';
}

export function normalizeErrorAnnotations(raw: unknown): EssayErrorAnnotation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row: any, idx) => ({
      id: String(row?.id || `err-${idx}`),
      start: Number(row?.start) || 0,
      end: Number(row?.end) || 0,
      kind: (['orthography', 'grammar', 'punctuation', 'speech', 'logic'].includes(row?.kind)
        ? row.kind
        : 'grammar') as EssayErrorKind,
      message: String(row?.message || ''),
      snippet: row?.snippet ? String(row.snippet) : undefined,
    }))
    .filter((a) => a.end > a.start && a.message.trim());
}

export function stripHtmlToPlain(html: string): string {
  if (!html || !html.includes('<')) return html || '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\u00a0/g, ' ').trim();
}

export function buildAnnotatedSegments(text: string, annotations: EssayErrorAnnotation[]) {
  const plain = text || '';
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  const segments: Array<{ text: string; annotation?: EssayErrorAnnotation }> = [];
  let cursor = 0;
  sorted.forEach((ann) => {
    if (ann.start < cursor || ann.start >= plain.length) return;
    if (ann.start > cursor) segments.push({ text: plain.slice(cursor, ann.start) });
    segments.push({ text: plain.slice(ann.start, Math.min(ann.end, plain.length)), annotation: ann });
    cursor = Math.min(ann.end, plain.length);
  });
  if (cursor < plain.length) segments.push({ text: plain.slice(cursor) });
  return segments;
}

export function newAnnotationId(): string {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
