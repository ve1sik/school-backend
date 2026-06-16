import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { installClientErrorReporting } from './lib/clientLog'

installClientErrorReporting()

if (import.meta.env.DEV) {
  import('eruda')
    .then(({ default: eruda }) => eruda.init())
    .catch(() => {})
} else if (new URLSearchParams(location.search).has('debug')) {
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/eruda@3.4.3/eruda.min.js'
  script.onload = () => {
    const eruda = (window as Window & { eruda?: { init: () => void } }).eruda
    eruda?.init()
  }
  document.body.appendChild(script)
}

function showFatalBootError(message: string) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML =
    '<div style="padding:24px;font-family:system-ui,sans-serif;text-align:center;max-width:360px;margin:0 auto;background:#f4f7fe;min-height:100vh;color:#111827">' +
    '<p style="font-weight:800;font-size:18px;margin:0 0 12px">Ошибка запуска</p>' +
    `<p style="color:#991b1b;font-size:13px;line-height:1.5;margin:0 0 16px;word-break:break-word">${message}</p>` +
    '<button type="button" onclick="location.reload()" style="padding:12px 20px;border:0;border-radius:12px;background:#5a4bff;color:#fff;font-weight:700">Обновить</button>' +
    '</div>'
}

const rootEl = document.getElementById('root')

if (!rootEl) {
  document.body.innerHTML = '<p style="padding:24px;font-family:system-ui">Ошибка загрузки приложения.</p>'
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    showFatalBootError(message)
  }
}
