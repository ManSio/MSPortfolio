import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defense: a runtime error anywhere in the app shows a readable
 * message instead of an empty (black) page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '2rem',
            background: 'var(--color-ink)',
            color: 'var(--color-paper)',
            fontFamily: 'var(--font-sans)',
            textAlign: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
            <p style={{ opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', wordBreak: 'break-all' }}>
              {this.state.error.message}
            </p>
            <pre
              style={{
                marginTop: '1rem',
                textAlign: 'left',
                maxHeight: '40vh',
                overflow: 'auto',
                fontSize: '0.7rem',
                opacity: 0.6,
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error.stack}
            </pre>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.6 }}>
              Please hard-refresh (Ctrl+F5). If it persists, open the console and report the error above.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
