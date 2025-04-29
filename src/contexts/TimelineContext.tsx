'use client';
import { createContext, useContext, useReducer, useMemo, useCallback, ReactNode, useEffect, useRef } from 'react';
import { TimelinePosition, TimelineEvent, FeedbackSession } from '../types';
interface TimelineState {
  currentPosition: TimelinePosition;
  totalDuration: TimelinePosition;
  isActive: boolean;
  mode: 'record' | 'replay' | 'idle';
  events: TimelineEvent[];
  sessionId: string | null;
  recordingStartTime: number | null;
  replayProgress: number;
  lastClearTime: TimelinePosition;
}
type TimelineActionType =
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'START_REPLAY'; payload: { events: TimelineEvent[], totalDuration: TimelinePosition } }
  | { type: 'STOP_REPLAY' }
  | { type: 'UPDATE_POSITION'; payload: { position: TimelinePosition } }
  | { type: 'UPDATE_PROGRESS'; payload: { progress: number } }
  | { type: 'ADD_EVENT'; payload: { event: TimelineEvent } }
  | { type: 'LOAD_SESSION'; payload: { session: FeedbackSession } }
  | { type: 'UPDATE_CLEAR_TIME'; payload: { clearTime: TimelinePosition } }
  | { type: 'RESET_TIMELINE_POSITION' }
  | { type: 'RESET' };
interface TimelineContextType {
  state: TimelineState;
  startRecording: () => void;
  stopRecording: () => void;
  startReplay: (events: TimelineEvent[], totalDuration: TimelinePosition) => void;
  stopReplay: () => void;
  updatePosition: (position: TimelinePosition) => void;
  updateProgress: (progress: number) => void;
  addEvent: (event: TimelineEvent) => void;
  loadSession: (session: FeedbackSession) => void;
  updateClearTime: (clearTime: TimelinePosition) => void;
  resetTimelinePosition: () => void;
  reset: () => void;
}
const initialState: TimelineState = {
  currentPosition: 0,
  totalDuration: 0,
  isActive: false,
  mode: 'idle',
  events: [],
  sessionId: null,
  recordingStartTime: null,
  replayProgress: 0,
  lastClearTime: 0,
};
function timelineReducer(state: TimelineState, action: TimelineActionType): TimelineState {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        isActive: true,
        mode: 'record',
        currentPosition: 0,
        recordingStartTime: Date.now(),
        events: [],
        sessionId: `session-${Date.now()}`,
        replayProgress: 0,
        lastClearTime: 0,
      };
    case 'STOP_RECORDING':
      return {
        ...state,
        isActive: false,
        mode: 'idle',
        currentPosition: 0,
      };
    case 'START_REPLAY':
      return {
        ...state,
        isActive: true,
        mode: 'replay',
        currentPosition: 0,
        events: action.payload.events,
        totalDuration: action.payload.totalDuration,
        replayProgress: 0,
        lastClearTime: 0,
      };
    case 'STOP_REPLAY':
      return {
        ...state,
        isActive: false,
        mode: 'idle',
        currentPosition: 0,
        replayProgress: 0,
      };
    case 'UPDATE_POSITION':
      return {
        ...state,
        currentPosition: action.payload.position,
      };
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        replayProgress: action.payload.progress,
      };
    case 'ADD_EVENT':
      return {
        ...state,
        events: [...state.events, action.payload.event],
      };
    case 'LOAD_SESSION':
      return {
        ...state,
        events: action.payload.session.events,
        sessionId: action.payload.session.id,
        totalDuration: action.payload.session.audioTrack.totalDuration,
      };
    case 'UPDATE_CLEAR_TIME':
      return {
        ...state,
        lastClearTime: action.payload.clearTime,
      };
    case 'RESET_TIMELINE_POSITION':
      return {
        ...state,
        currentPosition: 0,
        lastClearTime: 0,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}
const TimelineContext = createContext<TimelineContextType | null>(null);
interface TimelineProviderProps {
  children: ReactNode;
}
export function TimelineProvider({ children }: TimelineProviderProps) {
  const [state, dispatch] = useReducer(timelineReducer, initialState);
  const actions = useMemo(() => ({
    startRecording: () => dispatch({ type: 'START_RECORDING' }),
    stopRecording: () => dispatch({ type: 'STOP_RECORDING' }),
    startReplay: (events: TimelineEvent[], totalDuration: TimelinePosition) =>
      dispatch({ type: 'START_REPLAY', payload: { events, totalDuration } }),
    stopReplay: () => dispatch({ type: 'STOP_REPLAY' }),
    updatePosition: (position: TimelinePosition) =>
      dispatch({ type: 'UPDATE_POSITION', payload: { position } }),
    updateProgress: (progress: number) =>
      dispatch({ type: 'UPDATE_PROGRESS', payload: { progress } }),
    addEvent: (event: TimelineEvent) =>
      dispatch({ type: 'ADD_EVENT', payload: { event } }),
    loadSession: (session: FeedbackSession) =>
      dispatch({ type: 'LOAD_SESSION', payload: { session } }),
    updateClearTime: (clearTime: TimelinePosition) =>
      dispatch({ type: 'UPDATE_CLEAR_TIME', payload: { clearTime } }),
    resetTimelinePosition: () =>
      dispatch({ type: 'RESET_TIMELINE_POSITION' }),
    reset: () => dispatch({ type: 'RESET' }),
  }), []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__globalTimePosition = state.currentPosition;
    }
  }, [state.currentPosition]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__lastClearTime = state.lastClearTime;
    }
  }, [state.lastClearTime]);
  const contextValue = useMemo(() => ({
    state,
    ...actions,
  }), [state, actions]);
  return (
    <TimelineContext.Provider value={contextValue}>
      {children}
    </TimelineContext.Provider>
  );
}
export function useTimeline() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
}
export function useTimelinePosition() {
  const { state } = useTimeline();
  return state.currentPosition;
}
export function useRecordingTime() {
  const { state } = useTimeline();
  if (!state.recordingStartTime || state.mode !== 'record') {
    return 0;
  }
  return Date.now() - state.recordingStartTime;
}
export function useTimelineEvents() {
  const { state, addEvent } = useTimeline();
  return {
    events: state.events,
    addEvent,
  };
}
export function useLastClearTime() {
  const { state, updateClearTime } = useTimeline();
  return {
    lastClearTime: state.lastClearTime,
    updateClearTime,
  };
}