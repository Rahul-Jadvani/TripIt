import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: any;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-[40vh] items-center justify-center p-6">
            <div className="text-center space-y-3">
              <p className="text-lg font-bold">Something went wrong</p>
              <p className="text-sm text-muted-foreground">Try again or reload the page.</p>
              <div className="flex gap-2 justify-center">
                <button onClick={this.handleRetry} className="btn-secondary px-4 py-2 text-xs">Try again</button>
                <button onClick={() => window.location.reload()} className="btn-primary px-4 py-2 text-xs">Reload</button>
              </div>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

