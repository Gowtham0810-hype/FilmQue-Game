import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FilmQue caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg,#0a0a0c)] text-[var(--ink,#f5f5f7)] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--white-surface,#141416)] border border-[var(--line-strong,#27272a)] p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Something went wrong</h2>
            <p className="text-xs text-[var(--mute,#8e8e93)] mt-2 leading-relaxed">
              An unexpected render error occurred. Your game stats and daily progress are saved.
            </p>
            {this.state.error && (
              <pre className="mt-3 p-2 bg-black/40 text-[10px] text-red-400 font-mono text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 w-full py-2.5 px-4 bg-[var(--ink,#f5f5f7)] text-[var(--bg,#0a0a0c)] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
