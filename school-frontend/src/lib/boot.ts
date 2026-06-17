declare global {
  interface Window {
    __APP_BOOT_DONE__?: () => void
  }
}

export function clearBootOverlay() {
  document.querySelectorAll('#boot-msg,[data-boot-overlay]').forEach((el) => el.remove())
}

/** Вызывать только после первого commit React (useEffect), не сразу после render(). */
export function markBootDone() {
  document.documentElement.setAttribute('data-app-ready', '1')
  document.documentElement.removeAttribute('data-app-failed')
  if (typeof window.__APP_BOOT_DONE__ === 'function') {
    window.__APP_BOOT_DONE__()
  } else {
    clearBootOverlay()
  }
}

export function showBootError(detail: string) {
  if (document.documentElement.getAttribute('data-app-ready')) return
  document.documentElement.setAttribute('data-app-failed', '1')
  const tg = /Telegram/i.test(navigator.userAgent)
  const extra = tg ? ' Откройте prepodmgy.ru в Safari, не из Telegram.' : ''
  const html =
    `<div id="boot-msg" data-boot-overlay="1" style="position:fixed;inset:0;z-index:9999;padding:24px;font-family:system-ui,sans-serif;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f4f7fe">` +
    `<p style="font-weight:800;font-size:18px;margin:0 0 12px;color:#111827">Ошибка запуска</p>` +
    `<p style="color:#6b7280;font-size:14px;line-height:1.5;margin:0 0 16px;max-width:340px">${detail}${extra}</p>` +
    `<button type="button" onclick="location.href=location.pathname+'?v='+Date.now()" style="padding:12px 20px;border:0;border-radius:12px;background:#5a4bff;color:#fff;font-weight:700;cursor:pointer">Обновить</button>` +
    `</div>`
  clearBootOverlay()
  document.body.insertAdjacentHTML('beforeend', html)
}
