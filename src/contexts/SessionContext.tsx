'use client';
import { createContext, useContext, useReducer, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { FeedbackSession, TimelineEvent, AudioTrack, TimelinePosition, EntityId, CategoryRatings, Dictionary } from '../types';
import { v4 as uuidv4 } from 'uuid';
interface SessionState {
  session: FeedbackSession | null;
  isActive: boolean;
  mode: 'record' | 'replay' | 'idle';
  hasRecordedSession: boolean;
  categories: CategoryRatings;
}
type SessionActionType =
  | { type: 'START_RECORDING'; payload: { videoId: string } }
  | { type: 'STOP_RECORDING'; payload: { endTime: number; audioTrack: AudioTrack; events: TimelineEvent[] } }
  | { type: 'START_REPLAY' }
  | { type: 'STOP_REPLAY' }
  | { type: 'LOAD_SESSION'; payload: { session: FeedbackSession } }
  | { type: 'SET_CATEGORY'; payload: { category: string; rating: number | null } }
  | { type: 'CLEAR_CATEGORIES' }
  | { type: 'SET_CATEGORIES'; payload: { categories: CategoryRatings } }
  | { type: 'RESET' };
interface SessionContextType {
  state: SessionState;
  startRecording: (videoId: string) => void;
  stopRecording: (endTime: number, audioTrack: AudioTrack, events: TimelineEvent[]) => void;
  startReplay: () => void;
  stopReplay: () => void;
  loadSession: (session: FeedbackSession) => void;
  setCategory: (category: string, rating: number | null) => void;
  clearCategories: () => void;
  setCategories: (categories: CategoryRatings) => void;
  reset: () => void;
  saveSessionToFile: () => Promise<void>;
  prepareSessionForExport: () => Promise<FeedbackSession>;
}
const initialState: SessionState = {
  session: null,
  isActive: false,
  mode: 'idle',
  hasRecordedSession: false,
  categories: {},
};
function sessionReducer(state: SessionState, action: SessionActionType): SessionState {
  switch (action.type) {
    case 'START_RECORDING': {
      const startTime = Date.now();
      const sessionId = uuidv4();
      return {
        ...state,
        isActive: true,
        mode: 'record',
        session: {
          id: sessionId,
          videoId: action.payload.videoId,
          startTime,
          audioTrack: { chunks: [], totalDuration: 0 },
          events: [],
          categories: {}
        },
      };
    }
    case 'STOP_RECORDING': {
      if (!state.session) return state;
      const updatedSession: FeedbackSession = {
        ...state.session,
        endTime: action.payload.endTime,
        audioTrack: action.payload.audioTrack,
        events: action.payload.events,
        categories: convertCategoryRatingsToDict(state.categories),
      };
      return {
        ...state,
        isActive: false,
        mode: 'idle',
        session: updatedSession,
        hasRecordedSession: true,
      };
    }
    case 'START_REPLAY':
      return {
        ...state,
        isActive: true,
        mode: 'replay',
      };
    case 'STOP_REPLAY':
      return {
        ...state,
        isActive: false,
        mode: 'idle',
      };
    case 'LOAD_SESSION':
      return {
        ...state,
        session: action.payload.session,
        hasRecordedSession: true,
        categories: convertDictToCategoryRatings(action.payload.session.categories || {}),
      };
    case 'SET_CATEGORY': {
      const { category, rating } = action.payload;
      return {
        ...state,
        categories: {
          ...state.categories,
          [category]: rating,
        },
      };
    }
    case 'CLEAR_CATEGORIES':
      return {
        ...state,
        categories: {},
      };
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload.categories,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}
function convertCategoryRatingsToDict(ratings: CategoryRatings): Dictionary<number | boolean> {
  const result: Dictionary<number | boolean> = {};
  Object.entries(ratings).forEach(([category, rating]) => {
    if (rating !== null) {
      result[category] = rating;
    }
  });
  return result;
}
function convertDictToCategoryRatings(dict: Dictionary<number | boolean>): CategoryRatings {
  const result: CategoryRatings = {};
  Object.entries(dict).forEach(([category, value]) => {
    if (typeof value === 'boolean') {
      if (value === true) {
        result[category] = 5;
      } else {
        result[category] = null;
      }
    } else if (typeof value === 'number') {
      result[category] = value > 0 ? value : null;
    } else {
      result[category] = null;
    }
  });
  return result;
}
const SessionContext = createContext<SessionContextType | null>(null);
interface SessionProviderProps {
  children: ReactNode;
}
export function SessionProvider({ children }: SessionProviderProps) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const actions = useMemo(() => ({
    startRecording: (videoId: string) =>
      dispatch({ type: 'START_RECORDING', payload: { videoId } }),
    stopRecording: (endTime: number, audioTrack: AudioTrack, events: TimelineEvent[]) =>
      dispatch({ type: 'STOP_RECORDING', payload: { endTime, audioTrack, events } }),
    startReplay: () => dispatch({ type: 'START_REPLAY' }),
    stopReplay: () => dispatch({ type: 'STOP_REPLAY' }),
    loadSession: (session: FeedbackSession) =>
      dispatch({ type: 'LOAD_SESSION', payload: { session } }),
    setCategory: (category: string, rating: number | null) =>
      dispatch({ type: 'SET_CATEGORY', payload: { category, rating } }),
    clearCategories: () => dispatch({ type: 'CLEAR_CATEGORIES' }),
    setCategories: (categories: CategoryRatings) =>
      dispatch({ type: 'SET_CATEGORIES', payload: { categories } }),
    reset: () => dispatch({ type: 'RESET' }),
  }), []);
  const saveSessionToFile = useCallback(async () => {
    if (!state.session) {
      throw new Error('No session to save');
    }
    try {
      const sessionData = await prepareSessionForExport();
      const dataStr = JSON.stringify(sessionData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const a = document.createElement('a');
      a.setAttribute('href', dataUri);
      a.setAttribute('download', `feedback-session-${state.session.id}.json`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }, [state.session]);
  const prepareSessionForExport = useCallback(async () => {
    if (!state.session) {
      throw new Error('No session to export');
    }
    return {
      ...state.session,
      categories: convertCategoryRatingsToDict(state.categories),
    };
  }, [state.session, state.categories]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__hasRecordedSession = state.hasRecordedSession;
      window.__videoPlayerWrapper = {
        recordCategoryChange: (category, rating) => {
          actions.setCategory(category, rating);
        },
        isRecording: state.mode === 'record' && state.isActive,
      };
    }
  }, [state.hasRecordedSession, state.mode, state.isActive, actions]);
  const contextValue = useMemo(() => ({
    state,
    ...actions,
    saveSessionToFile,
    prepareSessionForExport,
  }), [state, actions, saveSessionToFile, prepareSessionForExport]);
  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
export function useCategories() {
  const { state, setCategory, clearCategories, setCategories } = useSession();
  return {
    categories: state.categories,
    setCategory,
    clearCategories,
    setCategories,
  };
}
export function useSessionAvailability() {
  const { state } = useSession();
  return {
    hasRecordedSession: state.hasRecordedSession,
    isActive: state.isActive,
    mode: state.mode,
  };
}