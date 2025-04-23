'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface ErrorBoundaryWrapperProps {
  component: React.ElementType;
  componentProps: any;
  name: string;
}

/**
 * A component that wraps another component with an ErrorBoundary
 * Useful for components that are used in multiple places
 */
export function ErrorBoundaryWrapper({
  component: Component,
  componentProps,
  name
}: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary fallback={
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h2 className="text-lg font-medium text-yellow-800 mb-2">{name} Error</h2>
        <p className="text-sm text-yellow-600">
          There was a problem with the {name.toLowerCase()}. Try refreshing the page.
        </p>
      </div>
    }>
      <Component {...componentProps} />
    </ErrorBoundary>
  );
}