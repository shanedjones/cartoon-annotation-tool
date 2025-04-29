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
export * from './TimelineContext';
export * from './AnnotationContext';
export * from './VideoContext';
export * from './SessionContext';
export * from './AuthContext';