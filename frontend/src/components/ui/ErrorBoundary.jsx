import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from './button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Something went wrong on this page
          </h2>
          <p className="mt-2 max-w-md text-xs sm:text-sm text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred while rendering this section.'}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={this.handleReset}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RotateCcw size={14} />
              Try Again
            </Button>
            <Button
              onClick={() => {
                this.handleReset();
                window.location.href = '/';
              }}
              size="sm"
              className="gap-2"
            >
              <Home size={14} />
              Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
