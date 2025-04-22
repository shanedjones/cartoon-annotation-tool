'use client';

import { ReactNode } from 'react';
import { TimelineProvider } from 'src/contexts/TimelineContext';
import { AnnotationProvider } from 'src/contexts/AnnotationContext';
import { VideoProvider } from 'src/contexts/VideoContext';
import { SessionProvider } from 'src/contexts/SessionContext';
import { AuthSessionProvider, AuthProvider } from 'src/contexts/AuthContext';
import { LastClearTimeProvider } from 'src/hooks/useLastClearTime';

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
            <LastClearTimeProvider>
              <AnnotationProvider>
                <VideoProvider initialUrl={initialVideoUrl}>
                  {children}
                </VideoProvider>
              </AnnotationProvider>
            </LastClearTimeProvider>
          </TimelineProvider>
        </SessionProvider>
      </AuthProvider>
    </AuthSessionProvider>
  );
}

/**
 * Export individual providers and hooks for direct imports
 */
export * from 'src/contexts/TimelineContext';
export * from 'src/contexts/AnnotationContext';
export * from 'src/contexts/VideoContext';
export * from 'src/contexts/SessionContext';
export * from 'src/contexts/AuthContext';
export * from 'src/hooks/useLastClearTime';