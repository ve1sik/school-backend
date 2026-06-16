import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          padding: '24px',
          background: '#f4f7fe',
          color: '#111827',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
            Не удалось загрузить страницу
          </h1>
          <p style={{ marginBottom: '16px', lineHeight: 1.5 }}>
            Попробуйте обновить страницу или открыть сайт в Safari, а не во встроенном браузере Telegram.
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
            }}
          >
            Обновить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
