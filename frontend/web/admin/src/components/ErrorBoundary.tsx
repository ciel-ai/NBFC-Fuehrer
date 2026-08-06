// src/components/ErrorBoundary.tsx
//
// App-level error boundary — a render crash shows a recoverable screen
// instead of a blank white page. Wraps the router in App.tsx; can also be
// nested around individual routes later if finer isolation is wanted.

import React from 'react';
import { Button, Result } from 'antd';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Surface in the console for diagnostics — replace with a telemetry
    // call when error reporting is wired up.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
    // Return to a known-good route; a crash often comes from bad route state
    window.location.assign('/dashboard');
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--ink-50)',
          }}
        >
          <Result
            status="500"
            title="Something went wrong"
            subTitle={
              <>
                The page hit an unexpected error and stopped rendering.
                <br />
                Your data is safe — no action was performed.
              </>
            }
            extra={
              <Button type="primary" onClick={this.reset}>
                Back to Dashboard
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
