/** Эвристики для отложенной загрузки на телефонах и медленных сетях. */

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return ['slow-2g', '2g', '3g'].includes(conn.effectiveType || '');
}

export function shouldDeferHeavyLoads(): boolean {
  return isMobileViewport() || isSlowConnection();
}

export function runWhenIdle(fn: () => void, timeoutMs = 2500): void {
  if (typeof window === 'undefined') {
    fn();
    return;
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => fn(), { timeout: timeoutMs });
    return;
  }
  setTimeout(fn, 120);
}

export function deferNonCritical(fn: () => void, delayMs = 2000): void {
  if (shouldDeferHeavyLoads()) {
    runWhenIdle(fn, delayMs);
    return;
  }
  fn();
}
