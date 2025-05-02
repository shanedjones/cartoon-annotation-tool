'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode
} from 'react';
import type { DrawingPath } from '../types';
import type { RecordedAction } from '../components/VideoPlayer';

interface RecordingState {
  isRecording: boolean;
  isReplaying: boolean;
  replayAnnotations: DrawingPath[];
  hasRecordedSession: boolean;
  isCompletedVideo: boolean;
}

interface RecordingContextType {
  state: RecordingState;
  onRecordAction: (action: RecordedAction) => void;
  onAnnotationAdded: (annotation: DrawingPath) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsReplaying: (isReplaying: boolean) => void;
  setReplayAnnotations: (annotations: DrawingPath[]) => void;
  setHasRecordedSession: (hasRecordedSession: boolean) => void;
  setIsCompletedVideo: (isCompletedVideo: boolean) => void;
}

const initialState: RecordingState = {
  isRecording: false,
  isReplaying: false,
  replayAnnotations: [],
  hasRecordedSession: false,
  isCompletedVideo: false
};

const RecordingContext = createContext<RecordingContextType | null>(null);

interface RecordingProviderProps {
  children: ReactNode;
  onRecordCallback?: (action: RecordedAction) => void;
  onAnnotationCallback?: (annotation: DrawingPath) => void;
  initialAnnotations?: DrawingPath[];
  initialIsRecording?: boolean;
  initialIsReplaying?: boolean;
  initialHasRecordedSession?: boolean;
  initialIsCompletedVideo?: boolean;
}

export function RecordingProvider({
  children,
  onRecordCallback,
  onAnnotationCallback,
  initialAnnotations = [],
  initialIsRecording = false,
  initialIsReplaying = false,
  initialHasRecordedSession = false,
  initialIsCompletedVideo = false
}: RecordingProviderProps) {
  // Get the initial recording state from both props and window global
  const windowIsRecording = typeof window !== 'undefined' && window.__isRecording === true;
  const [isRecording, setIsRecording] = useState(initialIsRecording || windowIsRecording);
  const [isReplaying, setIsReplaying] = useState(initialIsReplaying);
  const [replayAnnotations, setReplayAnnotations] = useState<DrawingPath[]>(initialAnnotations);
  const [hasRecordedSession, setHasRecordedSession] = useState(initialHasRecordedSession);
  const [isCompletedVideo, setIsCompletedVideo] = useState(initialIsCompletedVideo);
  
  // Listen for recording state changes from window events
  useEffect(() => {
    const handleRecordingStateChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.isRecording === 'boolean') {
        console.log('Recording state changed via event:', event.detail.isRecording);
        setIsRecording(event.detail.isRecording);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('recording-state-change', handleRecordingStateChange as EventListener);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('recording-state-change', handleRecordingStateChange as EventListener);
      }
    };
  }, []);

  const onRecordAction = useCallback((action: RecordedAction) => {
    // Always log the action to help with debugging
    console.log('Recording action:', action.type, action);
    
    // Check window recording state as a fallback
    const windowIsRecording = typeof window !== 'undefined' && window.__isRecording === true;
    const isCurrentlyRecording = isRecording || windowIsRecording;
    
    if (onRecordCallback && isCurrentlyRecording) {
      console.log('Forwarding action to callback:', action.type);
      onRecordCallback(action);
    } else if (!isCurrentlyRecording) {
      console.log('Action not recorded - not in recording mode');
    }
  }, [onRecordCallback, isRecording]);

  const onAnnotationAdded = useCallback((annotation: DrawingPath) => {
    // Always log the annotation to help with debugging
    console.log('Recording annotation:', annotation);
    
    // Check window recording state as a fallback
    const windowIsRecording = typeof window !== 'undefined' && window.__isRecording === true;
    const isCurrentlyRecording = isRecording || windowIsRecording;
    
    if (onAnnotationCallback && isCurrentlyRecording) {
      console.log('Forwarding annotation to callback');
      onAnnotationCallback(annotation);
    } else if (!isCurrentlyRecording) {
      console.log('Annotation not recorded - not in recording mode');
    }
  }, [onAnnotationCallback, isRecording]);

  const value = useMemo(() => ({
    state: {
      isRecording,
      isReplaying,
      replayAnnotations,
      hasRecordedSession,
      isCompletedVideo
    },
    onRecordAction,
    onAnnotationAdded,
    setIsRecording,
    setIsReplaying,
    setReplayAnnotations,
    setHasRecordedSession,
    setIsCompletedVideo
  }), [
    isRecording,
    isReplaying,
    replayAnnotations,
    hasRecordedSession,
    isCompletedVideo,
    onRecordAction,
    onAnnotationAdded
  ]);

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}

export function useRecordingState() {
  const { state } = useRecording();
  return state;
}

export function useRecordingActions() {
  const {
    onRecordAction,
    onAnnotationAdded,
    setIsRecording,
    setIsReplaying,
    setReplayAnnotations,
    setHasRecordedSession,
    setIsCompletedVideo
  } = useRecording();
  
  return {
    onRecordAction,
    onAnnotationAdded,
    setIsRecording,
    setIsReplaying,
    setReplayAnnotations,
    setHasRecordedSession,
    setIsCompletedVideo
  };
}