import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'

function showBootError(message: string) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML =
    '<div style="padding:24px;font-family:system-ui,sans-serif;text-align:center;max-width:360px;margin:0 auto;background:#f4f7fe;min-height:100vh;color:#111827">' +
    '<p style="font-weight:800;font-size:18px;margin:0 0 12px">Ошибка запуска</p>' +
    '<p style="color:#991b1b;font-size:13px;line-height:1.5;margin:0 0 16px;word-break:break-word">' +
    message +
    '</p>' +
    '<button type="button" onclick="location.reload()" style="padding:12px 20px;border:0;border-radius:12px;background:#5a4bff;color:#fff;font-weight:700">Обновить</button>' +
    '</div>'
}

const rootEl = document.getElementById('root')

if (!rootEl) {
  document.body.innerHTML =
    '<p style="padding:24px;font-family:system-ui">Ошибка загрузки приложения.</p>'
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>,
    )
  } catch (err) {
    showBootError(err instanceof Error ? err.message : String(err))
  }
}
