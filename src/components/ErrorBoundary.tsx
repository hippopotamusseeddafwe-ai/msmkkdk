import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center text-white/70">
          <p className="text-sm font-semibold">An unexpected rendering issue occurred.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-white hover:bg-white/20"
          >
            Retry View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
