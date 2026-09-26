import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

/**
 * Catches unhandled render/lifecycle errors in the React tree and shows a
 * recovery UI instead of a blank white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * The optional `fallback` prop replaces the default recovery UI.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for dev visibility; swap in a real logger if needed
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error: this.state.error, reset: this.handleReset });
    }

    return <DefaultErrorUI error={this.state.error} onReset={this.handleReset} />;
  }
}

// ─── Default recovery UI ──────────────────────────────────────────────────────

function DefaultErrorUI({ error, onReset }) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 ring-8 ring-danger-50/50">
        <AlertTriangle size={32} className="text-danger-500" />
      </div>

      {/* Heading */}
      <div className="max-w-sm">
        <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-500">
          An unexpected error occurred while rendering this section.
          You can try refreshing or go back to the dashboard.
        </p>
      </div>

      {/* Dev-only error details */}
      {isDev && error && (
        <details className="w-full max-w-xl rounded-lg border border-danger-200 bg-danger-50 text-left">
          <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-danger-700 select-none">
            Error details (dev only)
          </summary>
          <pre className="overflow-auto px-4 pb-4 pt-2 text-xs text-danger-800 whitespace-pre-wrap break-all">
            {error.stack || error.message}
          </pre>
        </details>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => (window.location.href = '/')}>
          <Home size={15} /> Dashboard
        </Button>
        <Button onClick={onReset}>
          <RefreshCw size={15} /> Try again
        </Button>
      </div>
    </div>
  );
}
