import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { showBootError } from './lib/boot'
import { installClientErrorReporting } from './lib/clientLog'

installClientErrorReporting()

const rootEl = document.getElementById('root')

if (!rootEl) {
  showBootError('Не найден контейнер приложения.')
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
    console.error('Boot failed', err)
    showBootError(err instanceof Error ? err.message : 'Неизвестная ошибка')
  }
}
