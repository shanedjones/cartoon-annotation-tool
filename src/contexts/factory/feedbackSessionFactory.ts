'use client';

import { createReducerContext } from './createReducerContext';

import React, { useCallback, useMemo, ReactNode, createContext, useContext, useReducer } from 'react';
import { FeedbackSession, TimelineEvent, AudioTrack, CategoryRatings, Dictionary } from '../../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session State Interface
 */
export interface FeedbackSessionState {
  // Current session data
  session: FeedbackSession | null;
  // Whether a recording/replay session is active
  isActive: boolean;
  // Current mode
  mode: 'record' | 'replay' | 'idle';
  // Whether a recorded session is available
  hasRecordedSession: boolean;
  // Category ratings
  categories: CategoryRatings;
}

/**
 * Session Context Interface
 */
export interface FeedbackSessionContextType {
  // Current state
  state: FeedbackSessionState;
  // Action dispatchers
  startRecording: (videoId: string) => void;
  stopRecording: (endTime: number, audioTrack: AudioTrack, events: TimelineEvent[]) => void;
  startReplay: () => void;
  stopReplay: () => void;
  loadSession: (session: FeedbackSession) => void;
  setCategory: (category: string, rating: number | null) => void;
  clearCategories: () => void;
  setCategories: (categories: CategoryRatings) => void;
  reset: () => void;
  // Helper functions
  saveSessionToFile: () => Promise<void>;
  prepareSessionForExport: () => Promise<FeedbackSession>;
}

/**
 * Session Action Types
 */
export type FeedbackSessionAction = 
  | { type: 'START_RECORDING'; payload: { videoId: string } }
  | { type: 'STOP_RECORDING'; payload: { endTime: number; audioTrack: AudioTrack; events: TimelineEvent[] } }
  | { type: 'START_REPLAY' }
  | { type: 'STOP_REPLAY' }
  | { type: 'LOAD_SESSION'; payload: { session: FeedbackSession } }
  | { type: 'SET_CATEGORY'; payload: { category: string; rating: number | null } }
  | { type: 'CLEAR_CATEGORIES' }
  | { type: 'SET_CATEGORIES'; payload: { categories: CategoryRatings } }
  | { type: 'RESET' };

// Helper function to convert category ratings to dictionary
function convertCategoryRatingsToDict(ratings: CategoryRatings): Dictionary<number | boolean> {
  const result: Dictionary<number | boolean> = {};
  
  Object.entries(ratings).forEach(([category, rating]) => {
    // Only include categories with non-null values
    if (rating !== null) {
      result[category] = rating; // Preserve the numeric rating
    }
  });
  
  return result;
}

// Helper function to convert dictionary to category ratings
function convertDictToCategoryRatings(dict: Dictionary<number | boolean>): CategoryRatings {
  const result: CategoryRatings = {};
  
  Object.entries(dict).forEach(([category, value]) => {
    // Handle both boolean and number values
    if (typeof value === 'boolean') {
      // Convert boolean values to ratings
      if (value === true) {
        result[category] = 5; // Default to highest rating
      } else {
        result[category] = null;
      }
    } else if (typeof value === 'number') {
      // Numbers can be directly used
      result[category] = value > 0 ? value : null;
    } else {
      result[category] = null;
    }
  });
  
  return result;
}

// Initial state
const initialFeedbackSessionState: FeedbackSessionState = {
  session: null,
  isActive: false,
  mode: 'idle',
  hasRecordedSession: false,
  categories: {},
};

// Session reducer
function feedbackSessionReducer(state: FeedbackSessionState, action: FeedbackSessionAction): FeedbackSessionState {
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
      return initialFeedbackSessionState;

    default:
      return state;
  }
}

// Create the context
const FeedbackSessionContext = createContext<FeedbackSessionContextType | null>(null);
FeedbackSessionContext.displayName = 'FeedbackSession';

/**
 * Session Provider Props
 */
interface FeedbackSessionProviderProps {
  children: ReactNode;
}

/**
 * Session Provider Component
 */
function FeedbackSessionProvider({ children }: FeedbackSessionProviderProps) {
  const [state, dispatch] = useReducer(feedbackSessionReducer, initialFeedbackSessionState);

  // Memoized action creators
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

  // Helper function to save session as a JSON file
  const saveSessionToFile = useCallback(async () => {
    if (!state.session) {
      throw new Error('No session to save');
    }
    
    try {
      // In a real implementation, this would include serializing audio data
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
      console.error('Error saving session:', error);
      return Promise.reject(error);
    }
  }, [state.session]);

  // Helper function to prepare session for export
  const prepareSessionForExport = useCallback(async () => {
    if (!state.session) {
      throw new Error('No session to export');
    }
    
    // In a real implementation, this would include serializing audio data
    // For now, we just return a copy of the session
    return {
      ...state.session,
      categories: convertCategoryRatingsToDict(state.categories),
    };
  }, [state.session, state.categories]);

  // Provide the context value
  const contextValue = useMemo(() => ({
    state,
    ...actions,
    saveSessionToFile,
    prepareSessionForExport,
  }), [state, actions, saveSessionToFile, prepareSessionForExport]);

  return React.createElement(
    FeedbackSessionContext.Provider,
    { value: contextValue },
    children
  );
}

/**
 * Custom hook to use the session context
 */
function useSession() {
  const context = useContext(FeedbackSessionContext);
  if (!context) {
    throw new Error('useSession must be used within a FeedbackSessionProvider');
  }
  return context;
}

/**
 * Custom hook to manage categories
 */
function useCategories() {
  const { state, setCategory, clearCategories, setCategories } = useSession();
  return {
    categories: state.categories,
    setCategory,
    clearCategories,
    setCategories,
  };
}

/**
 * Custom hook to check if a session is available
 */
function useSessionAvailability() {
  const { state } = useSession();
  return {
    hasRecordedSession: state.hasRecordedSession,
    isActive: state.isActive,
    mode: state.mode,
  };
}

/**
 * Creates the feedback session context using the factory pattern
 */
export function createFeedbackSessionContext() {
  // Create action creators
  const actionCreators = {
    startRecording: (videoId: string) => 
      ({ type: 'START_RECORDING', payload: { videoId } } as const),
    
    stopRecording: (endTime: number, audioTrack: AudioTrack, events: TimelineEvent[]) => 
      ({ type: 'STOP_RECORDING', payload: { endTime, audioTrack, events } } as const),
    
    startReplay: () => ({ type: 'START_REPLAY' } as const),
    
    stopReplay: () => ({ type: 'STOP_REPLAY' } as const),
    
    loadSession: (session: FeedbackSession) => 
      ({ type: 'LOAD_SESSION', payload: { session } } as const),
    
    setCategory: (category: string, rating: number | null) => 
      ({ type: 'SET_CATEGORY', payload: { category, rating } } as const),
    
    clearCategories: () => ({ type: 'CLEAR_CATEGORIES' } as const),
    
    setCategories: (categories: CategoryRatings) => 
      ({ type: 'SET_CATEGORIES', payload: { categories } } as const),
    
    reset: () => ({ type: 'RESET' } as const),
  };
  
  // Create the context
  const context = createReducerContext<FeedbackSessionState, FeedbackSessionAction>(
    'FeedbackSession',
    feedbackSessionReducer,
    initialFeedbackSessionState,
    actionCreators
  );
  
  // Get the base context
  const { Provider, useContextHook } = context;
  
  // Create custom hook with session-specific functionality
  const useSessionExtended = () => {
    const contextValue = useContextHook();
    const { state } = contextValue;
    
    // Helper function to save session as a JSON file
    const saveSessionToFile = useCallback(async () => {
      if (!state.session) {
        throw new Error('No session to save');
      }
      
      try {
        // In a real implementation, this would include serializing audio data
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
        console.error('Error saving session:', error);
        return Promise.reject(error);
      }
    }, [state.session]);
    
    // Helper function to prepare session for export
    const prepareSessionForExport = useCallback(async () => {
      if (!state.session) {
        throw new Error('No session to export');
      }
      
      // In a real implementation, this would include serializing audio data
      // For now, we just return a copy of the session
      return {
        ...state.session,
        categories: convertCategoryRatingsToDict(state.categories),
      };
    }, [state.session, state.categories]);
    
    return {
      ...contextValue,
      saveSessionToFile,
      prepareSessionForExport,
    };
  };
  
  // Categories hook
  const useCategoriesHook = () => {
    const { state, setCategory, clearCategories, setCategories } = useSessionExtended();
    return {
      categories: state.categories,
      setCategory,
      clearCategories,
      setCategories,
    };
  };
  
  // Session availability hook
  const useSessionAvailabilityHook = () => {
    const { state } = useSessionExtended();
    return {
      hasRecordedSession: state.hasRecordedSession,
      isActive: state.isActive,
      mode: state.mode,
    };
  };
  
  return {
    Provider,
    useSession: useSessionExtended,
    useCategories: useCategoriesHook,
    useSessionAvailability: useSessionAvailabilityHook,
  };
}

// Export the main interfaces and types
export {
  feedbackSessionReducer,
  initialFeedbackSessionState
};