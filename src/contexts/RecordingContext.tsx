'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
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
  const [isRecording, setIsRecording] = useState(initialIsRecording);
  const [isReplaying, setIsReplaying] = useState(initialIsReplaying);
  const [replayAnnotations, setReplayAnnotations] = useState<DrawingPath[]>(initialAnnotations);
  const [hasRecordedSession, setHasRecordedSession] = useState(initialHasRecordedSession);
  const [isCompletedVideo, setIsCompletedVideo] = useState(initialIsCompletedVideo);

  const onRecordAction = useCallback((action: RecordedAction) => {
    if (onRecordCallback) {
      onRecordCallback(action);
    }
  }, [onRecordCallback]);

  const onAnnotationAdded = useCallback((annotation: DrawingPath) => {
    if (onAnnotationCallback) {
      onAnnotationCallback(annotation);
    }
  }, [onAnnotationCallback]);

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