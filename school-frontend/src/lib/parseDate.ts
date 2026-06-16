/** Safari-safe parsing for API date strings (prefer ISO 8601 from backend). */
export function parseSafeDate(value: string | number | Date | null | undefined): Date {
  if (value == null || value === '') return new Date(Number.NaN);
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const iso = new Date(normalized);
    if (!Number.isNaN(iso.getTime())) return iso;
  }

  const fallback = new Date(raw);
  return fallback;
}

export function parseSafeDateMs(value: string | number | Date | null | undefined): number {
  return parseSafeDate(value).getTime();
}
