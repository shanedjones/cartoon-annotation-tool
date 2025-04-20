'use client';

import React, { createContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
import { TimelineState, TimelineEvent, TimelineMarker } from '../types';
import { timelineReducer, initialTimelineState, TimelineAction, TIMELINE_ACTIONS } from './reducer';
import { withDevTools } from '../utils';

// Context type includes both state and dispatch
type TimelineContextType = {
  state: TimelineState;
  dispatch: React.Dispatch<TimelineAction>;
};

// Create the context
export const TimelineContext = createContext<TimelineContextType | null>(null);

// Provider props
interface TimelineProviderProps {
  children: ReactNode;
  initialState?: Partial<TimelineState>;
}

/**
 * Timeline Provider component
 */
export function TimelineProvider({ children, initialState }: TimelineProviderProps) {
  // Initialize reducer with merged initial state and DevTools support
  const [state, dispatch] = useReducer(
    withDevTools(timelineReducer, 'timeline'),
    { ...initialTimelineState, ...initialState }
  );

  // Sync with global window object for backward compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__globalTimePosition = state.position;
    }
  }, [state.position]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <TimelineContext.Provider value={contextValue}>
      {children}
    </TimelineContext.Provider>
  );
}
