import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'

declare global {
  interface Window {
    __APP_BOOT_DONE__?: () => void
  }
}

function markBootDone() {
  document.documentElement.setAttribute('data-app-ready', '1')
  if (typeof window.__APP_BOOT_DONE__ === 'function') {
    window.__APP_BOOT_DONE__()
  } else {
    document.getElementById('boot-msg')?.remove()
  }
}

function showBootError(detail: string) {
  if (document.documentElement.getAttribute('data-app-ready')) return
  document.documentElement.setAttribute('data-app-ready', '1')
  const tg = /Telegram/i.test(navigator.userAgent)
  const extra = tg
    ? ' Откройте prepodmgy.ru в Safari или Chrome, не из Telegram.'
    : ''
  const html =
    `<div id="boot-msg" style="position:fixed;inset:0;z-index:9999;padding:24px;font-family:system-ui,sans-serif;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f4f7fe">` +
    `<p style="font-weight:800;font-size:18px;margin:0 0 12px;color:#111827">Ошибка запуска</p>` +
    `<p style="color:#6b7280;font-size:14px;line-height:1.5;margin:0 0 16px;max-width:340px">${detail}${extra}</p>` +
    `<button onclick="location.reload(true)" style="padding:12px 20px;border:0;border-radius:12px;background:#5a4bff;color:#fff;font-weight:700;cursor:pointer">Обновить</button>` +
    `</div>`
  const el = document.getElementById('boot-msg')
  if (el) el.outerHTML = html
  else document.body.insertAdjacentHTML('beforeend', html)
}

const rootEl = document.getElementById('root')

if (!rootEl) {
  showBootError('Не найден контейнер приложения.')
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )
    markBootDone()
  } catch (err) {
    console.error('Boot failed', err)
    showBootError(err instanceof Error ? err.message : 'Неизвестная ошибка')
  }
}
