'use client';

import { ReactNode } from 'react';
import { TimelineProvider } from './TimelineContext';
import { AnnotationProvider } from './AnnotationContext';
import { VideoProvider } from './VideoContext';
import { SessionProvider } from './SessionContext';
import { AuthSessionProvider, AuthProvider } from './AuthContext';

interface AppProvidersProps {
  children: ReactNode;
  initialVideoUrl?: string;
}

/**
 * Combines all context providers in the correct nesting order
 */
export function AppProviders({ children, initialVideoUrl = '' }: AppProvidersProps) {
  return (
    <AuthSessionProvider>
      <AuthProvider>
        <SessionProvider>
          <TimelineProvider>
            <AnnotationProvider>
              <VideoProvider initialUrl={initialVideoUrl}>
                {children}
              </VideoProvider>
            </AnnotationProvider>
          </TimelineProvider>
        </SessionProvider>
      </AuthProvider>
    </AuthSessionProvider>
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