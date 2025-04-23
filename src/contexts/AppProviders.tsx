'use client';

import { ReactNode } from 'react';
import { TimelineProvider } from './TimelineContext';
import { AnnotationProvider } from './AnnotationContext';
import { VideoProvider } from './VideoContext';
import { SessionProvider } from './SessionContext';
import { AuthSessionProvider, AuthProvider } from './AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AppProvidersProps {
  children: ReactNode;
  initialVideoUrl?: string;
}

/**
 * Combines all context providers in the correct nesting order
 */
export function AppProviders({ children, initialVideoUrl = '' }: AppProvidersProps) {
  return (
    <ErrorBoundary name="RootProvider">
      <AuthSessionProvider>
        <ErrorBoundary name="AuthSessionProvider">
          <AuthProvider>
            <ErrorBoundary name="AuthProvider">
              <SessionProvider>
                <ErrorBoundary name="SessionProvider">
                  <TimelineProvider>
                    <ErrorBoundary name="TimelineProvider">
                      <AnnotationProvider>
                        <ErrorBoundary name="AnnotationProvider">
                          <VideoProvider initialUrl={initialVideoUrl}>
                            <ErrorBoundary name="ContentBoundary">
                              {children}
                            </ErrorBoundary>
                          </VideoProvider>
                        </ErrorBoundary>
                      </AnnotationProvider>
                    </ErrorBoundary>
                  </TimelineProvider>
                </ErrorBoundary>
              </SessionProvider>
            </ErrorBoundary>
          </AuthProvider>
        </ErrorBoundary>
      </AuthSessionProvider>
    </ErrorBoundary>
  );
}

/**
 * Export individual providers and hooks for direct imports
 */
export * from './TimelineContext';
export * from './AnnotationContext';
export * from './VideoContext';
export * from './SessionContext';
export * from './AuthContext';