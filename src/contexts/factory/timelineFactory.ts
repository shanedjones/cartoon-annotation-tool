'use client';

import { createReducerContext } from './createReducerContext';

import React, { useCallback, useMemo, ReactNode, createContext, useContext, useReducer } from 'react';
import { TimelinePosition } from '../../types';

/**
 * Timeline State Interface
 */
export interface TimelineState {
  // Current global timeline position
  currentPosition: TimelinePosition;
  // Timeline duration
  duration: TimelinePosition;
  // Whether the timeline is playing
  isPlaying: boolean;
  // Playback rate
  playbackRate: number;
}

/**
 * Timeline Context Interface
 */
export interface TimelineContextType {
  // State
  state: TimelineState;
  // Actions
  setPosition: (position: TimelinePosition) => void;
  setDuration: (duration: TimelinePosition) => void;
  play: () => void;
  pause: () => void;
  setPlaybackRate: (rate: number) => void;
  reset: () => void;
  // Helper methods
  togglePlay: () => void;
  seekToPercentage: (percentage: number) => void;
  getCurrentPercentage: () => number;
}

/**
 * Timeline Action Types
 */
export type TimelineAction = 
  | { type: 'SET_POSITION'; payload: { position: TimelinePosition } }
  | { type: 'SET_DURATION'; payload: { duration: TimelinePosition } }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_PLAYBACK_RATE'; payload: { rate: number } }
  | { type: 'RESET' };

// Initial state
const initialTimelineState: TimelineState = {
  currentPosition: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,
};

// Timeline reducer
function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  switch (action.type) {
    case 'SET_POSITION':
      return {
        ...state,
        currentPosition: action.payload.position,
      };

    case 'SET_DURATION':
      return {
        ...state,
        duration: action.payload.duration,
      };

    case 'PLAY':
      return {
        ...state,
        isPlaying: true,
      };

    case 'PAUSE':
      return {
        ...state,
        isPlaying: false,
      };

    case 'SET_PLAYBACK_RATE':
      return {
        ...state,
        playbackRate: action.payload.rate,
      };

    case 'RESET':
      return initialTimelineState;

    default:
      return state;
  }
}

// Create the context
const TimelineContext = createContext<TimelineContextType | null>(null);
TimelineContext.displayName = 'Timeline';

/**
 * Timeline Provider Props
 */
interface TimelineProviderProps {
  children: ReactNode;
}

/**
 * Timeline Provider Component
 */
function TimelineProvider({ children }: TimelineProviderProps) {
  const [state, dispatch] = useReducer(timelineReducer, initialTimelineState);

  // Action creators
  const setPosition = useCallback((position: TimelinePosition) => {
    dispatch({ type: 'SET_POSITION', payload: { position } });
  }, []);
  
  const setDuration = useCallback((duration: TimelinePosition) => {
    dispatch({ type: 'SET_DURATION', payload: { duration } });
  }, []);
  
  const play = useCallback(() => {
    dispatch({ type: 'PLAY' });
  }, []);
  
  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);
  
  const setPlaybackRate = useCallback((rate: number) => {
    dispatch({ type: 'SET_PLAYBACK_RATE', payload: { rate } });
  }, []);
  
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Helper methods
  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      dispatch({ type: 'PAUSE' });
    } else {
      dispatch({ type: 'PLAY' });
    }
  }, [state.isPlaying]);

  const seekToPercentage = useCallback((percentage: number) => {
    const position = (percentage / 100) * state.duration;
    dispatch({ type: 'SET_POSITION', payload: { position } });
  }, [state.duration]);

  const getCurrentPercentage = useCallback(() => {
    if (state.duration === 0) return 0;
    return (state.currentPosition / state.duration) * 100;
  }, [state.currentPosition, state.duration]);

  // Create context value
  const contextValue = useMemo(() => ({
    state,
    setPosition,
    setDuration,
    play,
    pause,
    setPlaybackRate,
    reset,
    togglePlay,
    seekToPercentage,
    getCurrentPercentage,
  }), [
    state, 
    setPosition, 
    setDuration, 
    play, 
    pause, 
    setPlaybackRate, 
    reset, 
    togglePlay, 
    seekToPercentage, 
    getCurrentPercentage
  ]);

  return React.createElement(
    TimelineContext.Provider,
    { value: contextValue },
    children
  );
}

/**
 * Custom hook to use the timeline context
 */
function useTimeline() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
}

/**
 * Creates the timeline context using the factory pattern
 */
export function createTimelineContext() {
  // Create action creators
  const actionCreators = {
    setPosition: (position: TimelinePosition) => 
      ({ type: 'SET_POSITION', payload: { position } } as const),
    
    setDuration: (duration: TimelinePosition) => 
      ({ type: 'SET_DURATION', payload: { duration } } as const),
    
    play: () => ({ type: 'PLAY' } as const),
    
    pause: () => ({ type: 'PAUSE' } as const),
    
    setPlaybackRate: (rate: number) => 
      ({ type: 'SET_PLAYBACK_RATE', payload: { rate } } as const),
    
    reset: () => ({ type: 'RESET' } as const),
  };
  
  // Create the context
  const context = createReducerContext<TimelineState, TimelineAction>(
    'Timeline',
    timelineReducer,
    initialTimelineState,
    actionCreators
  );
  
  // Get the base context
  const { Provider, useContextHook } = context;
  
  // Create custom hook with timeline-specific functionality
  const useTimelineExtended = () => {
    const contextValue = useContextHook();
    const { state } = contextValue;
    
    // Toggle play/pause
    const togglePlay = useCallback(() => {
      if (state.isPlaying) {
        contextValue.pause();
      } else {
        contextValue.play();
      }
    }, [state.isPlaying, contextValue]);
    
    // Seek to a percentage of the timeline
    const seekToPercentage = useCallback((percentage: number) => {
      const position = (percentage / 100) * state.duration;
      contextValue.setPosition(position);
    }, [state.duration, contextValue]);
    
    // Get the current position as a percentage
    const getCurrentPercentage = useCallback(() => {
      if (state.duration === 0) return 0;
      return (state.currentPosition / state.duration) * 100;
    }, [state.currentPosition, state.duration]);
    
    return {
      ...contextValue,
      togglePlay,
      seekToPercentage,
      getCurrentPercentage,
    };
  };
  
  return {
    Provider,
    useTimeline: useTimelineExtended,
  };
}

// Export the main interfaces and types
export {
  timelineReducer,
  initialTimelineState,
  TimelineProvider,
  useTimeline
};