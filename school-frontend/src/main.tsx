import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'

const rootEl = document.getElementById('root')

if (!rootEl) {
  document.body.innerHTML = '<p style="padding:24px;font-family:system-ui">Ошибка загрузки приложения.</p>'
} else {
  ReactDOM.createRoot(rootEl).render(
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>,
  )
}
