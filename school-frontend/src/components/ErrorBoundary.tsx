import * as React from 'react'
import { reportClientError } from '../lib/clientLog'

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('React error boundary:', error, info.componentStack)
    reportClientError(error, info.componentStack ?? 'ErrorBoundary')
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || 'Неизвестная ошибка'
      return (
        <div
          style={{
            minHeight: '-webkit-fill-available',
            padding: '24px',
            background: '#f4f7fe',
            color: '#111827',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#dc2626' }}>
            Упс, ошибка в интерфейсе
          </h1>
          <p
            style={{
              marginBottom: '16px',
              lineHeight: 1.5,
              maxWidth: '360px',
              fontSize: '13px',
              fontFamily: 'ui-monospace, monospace',
              background: '#fff',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#374151',
              wordBreak: 'break-word',
            }}
          >
            {msg}
          </p>
          <p style={{ marginBottom: '16px', lineHeight: 1.5, maxWidth: '340px', color: '#6b7280', fontSize: '14px' }}>
            Попробуйте обновить страницу. Если ошибка повторяется — напишите куратору или в поддержку.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: '#5A4BFF',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Обновить страницу
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
