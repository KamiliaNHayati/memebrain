'use client';

// components/error-boundary-wrapper.tsx
// Client-side wrapper so ErrorBoundary can be used in server layout.

import { ErrorBoundary } from './error-boundary';

export function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
