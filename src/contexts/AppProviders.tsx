'use client';
import { ReactNode } from 'react';
import { TimelineProvider } from './TimelineContext';
import { AnnotationProvider } from './AnnotationContext';
import { VideoProvider } from './VideoContext';
import { SessionProvider } from './SessionContext';
import { AuthSessionProvider, AuthProvider } from './AuthContext';
import { DrawingToolsProvider } from './DrawingToolsContext';
import { FeedbackProvider } from './FeedbackContext';

interface AppProvidersProps {
  children: ReactNode;
  initialVideoUrl?: string;
  onCategoriesCleared?: () => void;
  onCategoriesLoaded?: (categories: Record<string, number>) => void;
}

export function AppProviders({ 
  children, 
  initialVideoUrl = '',
  onCategoriesCleared,
  onCategoriesLoaded
}: AppProvidersProps) {
  return (
    <AuthSessionProvider>
      <AuthProvider>
        <SessionProvider>
          <TimelineProvider>
            <AnnotationProvider>
              <DrawingToolsProvider>
                <FeedbackProvider
                  onCategoriesCleared={onCategoriesCleared}
                  onCategoriesLoaded={onCategoriesLoaded}
                >
                  <VideoProvider initialUrl={initialVideoUrl}>
                    {children}
                  </VideoProvider>
                </FeedbackProvider>
              </DrawingToolsProvider>
            </AnnotationProvider>
          </TimelineProvider>
        </SessionProvider>
      </AuthProvider>
    </AuthSessionProvider>
  );
}

export * from './TimelineContext';
export * from './AnnotationContext';
export * from './VideoContext';
export * from './SessionContext';
export * from './AuthContext';
export * from './DrawingToolsContext';
export * from './FeedbackContext';