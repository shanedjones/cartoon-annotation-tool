'use client';
import { ReactNode } from 'react';
import { TimelineProvider } from './TimelineContext';
import { AnnotationProvider } from './AnnotationContext';
import { VideoProvider } from './VideoContext';
import { SessionProvider } from './SessionContext';
import { AuthSessionProvider, AuthProvider } from './AuthContext';
import { DrawingToolsProvider } from './DrawingToolsContext';
import { FeedbackProvider } from './FeedbackContext';
import { RecordingProvider } from './RecordingContext';
import type { DrawingPath } from '../types';
import type { RecordedAction } from '../components/VideoPlayer';

interface AppProvidersProps {
  children: ReactNode;
  initialVideoUrl?: string;
  onCategoriesCleared?: () => void;
  onCategoriesLoaded?: (categories: Record<string, number>) => void;
  onRecordAction?: (action: RecordedAction) => void;
  onAnnotationAdded?: (annotation: DrawingPath) => void;
  initialAnnotations?: DrawingPath[];
  initialIsRecording?: boolean;
  initialIsReplaying?: boolean;
  initialHasRecordedSession?: boolean;
  initialIsCompletedVideo?: boolean;
}

export function AppProviders({ 
  children, 
  initialVideoUrl = '',
  onCategoriesCleared,
  onCategoriesLoaded,
  onRecordAction,
  onAnnotationAdded,
  initialAnnotations = [],
  initialIsRecording = false,
  initialIsReplaying = false,
  initialHasRecordedSession = false,
  initialIsCompletedVideo = false
}: AppProvidersProps) {
  return (
    <AuthSessionProvider>
      <AuthProvider>
        <SessionProvider>
          <TimelineProvider>
            <AnnotationProvider>
              <DrawingToolsProvider>
                <RecordingProvider
                  onRecordCallback={onRecordAction}
                  onAnnotationCallback={onAnnotationAdded}
                  initialAnnotations={initialAnnotations}
                  initialIsRecording={initialIsRecording}
                  initialIsReplaying={initialIsReplaying}
                  initialHasRecordedSession={initialHasRecordedSession}
                  initialIsCompletedVideo={initialIsCompletedVideo}
                >
                  <FeedbackProvider
                    onCategoriesCleared={onCategoriesCleared}
                    onCategoriesLoaded={onCategoriesLoaded}
                  >
                    <VideoProvider initialUrl={initialVideoUrl}>
                      {children}
                    </VideoProvider>
                  </FeedbackProvider>
                </RecordingProvider>
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
export * from './RecordingContext';