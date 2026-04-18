'use client';

// components/error-boundary.tsx
// React Error Boundary wrapper — catches unhandled runtime errors in any page
// and shows a user-friendly fallback UI with retry option.

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="mx-auto max-w-lg px-4 py-20 text-center animate-page-enter">
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-8">
            <div className="text-5xl mb-4">💥</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-[#a1a1aa] mb-1">
              An unexpected error occurred. This has been logged automatically.
            </p>
            <p className="text-xs text-red-400/70 font-mono mb-6 break-all">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="rounded-lg bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-black hover:bg-[#16a34a] transition-colors"
              >
                ↻ Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="rounded-lg border border-[#262626] bg-[#111111] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors"
              >
                🏠 Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
