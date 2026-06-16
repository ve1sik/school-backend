const MAX_REPORTS = 8;
let reportCount = 0;

export function reportClientError(err: unknown, context?: string) {
  if (reportCount >= MAX_REPORTS) return;
  reportCount += 1;

  const payload = {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    context,
    url: typeof location !== 'undefined' ? location.href : undefined,
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    ts: new Date().toISOString(),
  };

  console.error('[client]', payload);

  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/client-log', new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch('/api/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function installClientErrorReporting() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    reportClientError(event.error ?? event.message, 'window.error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, 'unhandledrejection');
  });
}
