/** Transient DB errors (pooler idle, timeout) that often last a few minutes. */
export function isTransientDbError(err: unknown): boolean {
  const code = String((err as { code?: string })?.code || '');
  const msg = String((err as { message?: string })?.message || '');
  if (['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2034'].includes(code)) return true;
  return /can't reach database|connection reset|timed out|server has closed|connection refused|too many connections/i.test(
    msg,
  );
}
