'use client';

/**
 * Compatibility layer for bidirectional synchronization between
 * the new state management system and legacy window globals.
 * 
 * This provides a smooth transition path for components that haven't
 * been fully migrated to the new state system yet.
 */

import React, { useEffect } from 'react';
import { 
  useSession, 
  useSessionActions,
  useAnnotation, 
  useAnnotationActions,
  useTimeline, 
  useTimelineActions,
  useMedia,
  useMediaActions
} from './index';

/**
 * The GlobalCompatibilityProvider handles bidirectional sync between state and window globals.
 * It listens for changes in both directions and keeps them in sync.
 */
export function GlobalCompatibilityProvider({ children }: { children: React.ReactNode }) {
  // Get state from context
  const session = useSession();
  const sessionActions = useSessionActions();
  const annotation = useAnnotation();
  const annotationActions = useAnnotationActions();
  const timeline = useTimeline();
  const timelineActions = useTimelineActions();
  const media = useMedia();
  const mediaActions = useMediaActions();

  // Sync from state to window globals
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Session state sync
    window.__hasRecordedSession = session.currentSession !== null || session.sessionHistory.length > 0;
    window.__sessionReady = session.status === 'idle' && session.currentSession !== null;
    window.__isReplaying = session.isReplaying;

    // Annotation sync
    window.__lastClearTime = annotation.lastClearTime;

    // Log synchronization for debugging
    console.log('Sync from state to window globals:', {
      hasRecordedSession: window.__hasRecordedSession,
      sessionReady: window.__sessionReady,
      isReplaying: window.__isReplaying,
      lastClearTime: window.__lastClearTime
    });
  }, [session, annotation]);

  // Sync from window globals to state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Setup event listeners for legacy global events
    const handleSessionAvailable = () => {
      if (!window.__hasRecordedSession && (session.currentSession !== null || session.sessionHistory.length > 0)) {
        window.__hasRecordedSession = true;
      }
    };

    const handleSessionReady = () => {
      if (!window.__sessionReady && session.currentSession !== null && session.status === 'idle') {
        sessionActions.setStatus('idle');
        window.__sessionReady = true;
      }
    };

    const handleGlobalTimeChange = () => {
      if (typeof window.__globalTimePosition === 'number') {
        timelineActions.setPosition(window.__globalTimePosition);
      }
    };

    // Add event listeners
    window.addEventListener('session-available', handleSessionAvailable);
    window.addEventListener('session-ready', handleSessionReady);
    window.addEventListener('global-time-update', handleGlobalTimeChange);

    // Setup MutationObserver for tracking changes to window globals
    const setupWatchForGlobalChanges = () => {
      // This is a polyfill approach since we can't directly watch window properties
      // We check at intervals for changes
      const checkInterval = setInterval(() => {
        // Check for session state changes
        if (window.__hasRecordedSession && !session.currentSession && session.sessionHistory.length === 0) {
          console.log('Detected window.__hasRecordedSession change, updating state');
          // We can't directly create a session, but we can update the status
          sessionActions.setStatus('idle');
        }

        if (window.__isReplaying !== session.isReplaying) {
          console.log('Detected window.__isReplaying change, updating state');
          if (window.__isReplaying) {
            sessionActions.startReplay();
          } else {
            sessionActions.stopReplay();
          }
        }

        // Check for annotation changes
        if (window.__lastClearTime !== annotation.lastClearTime && window.__lastClearTime) {
          console.log('Detected window.__lastClearTime change, updating state');
          annotationActions.clearAnnotations();
          annotationActions.setLastClearTime(window.__lastClearTime);
        }
      }, 300); // Check every 300ms

      // Return cleanup function
      return () => clearInterval(checkInterval);
    };

    // Start watching for changes
    const cleanup = setupWatchForGlobalChanges();

    // Cleanup function
    return () => {
      window.removeEventListener('session-available', handleSessionAvailable);
      window.removeEventListener('session-ready', handleSessionReady);
      window.removeEventListener('global-time-update', handleGlobalTimeChange);
      cleanup();
    };
  }, [session, annotation, sessionActions, annotationActions, timelineActions]);

  // Initialize window objects if needed
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize window.__videoPlayerWrapper if not exist
    if (!window.__videoPlayerWrapper) {
      window.__videoPlayerWrapper = {
        recordCategoryChange: (category: string, rating: number) => {
          // Forward to state system
          sessionActions.setCategory(category, rating);
        },
        isRecording: session.isRecording,
        // Add compatible functions for legacy components
        setPlaying: (playing: boolean) => {
          if (playing) {
            mediaActions.play();
          } else {
            mediaActions.pause();
          }
        }
      };
    }
    
    // Update the recordCategoryChange method
    if (window.__videoPlayerWrapper) {
      window.__videoPlayerWrapper.recordCategoryChange = (category: string, rating: number) => {
        sessionActions.setCategory(category, rating);
      };
      window.__videoPlayerWrapper.isRecording = session.isRecording;
    }
  }, [session.isRecording, sessionActions, mediaActions]);

  return <>{children}</>;
}