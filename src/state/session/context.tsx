'use client';

import React, { createContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
import { SessionState, Session } from '../types';
import { sessionReducer, initialSessionState, SessionAction, SESSION_ACTIONS } from './reducer';
import { withDevTools } from '../utils';

// Context type includes both state and dispatch
type SessionContextType = {
  state: SessionState;
  dispatch: React.Dispatch<SessionAction>;
};

// Create the context
export const SessionContext = createContext<SessionContextType | null>(null);

// Provider props
interface SessionProviderProps {
  children: ReactNode;
  initialState?: Partial<SessionState>;
}

/**
 * Session Provider component
 */
export function SessionProvider({ children, initialState }: SessionProviderProps) {
  // Initialize reducer with merged initial state and DevTools support
  const [state, dispatch] = useReducer(
    withDevTools(sessionReducer, 'session'),
    { ...initialSessionState, ...initialState }
  );

  // Sync with global window object for backward compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__hasRecordedSession = state.sessionHistory.length > 0;
      window.__isCompletedVideo = state.status === 'idle';
      window.__sessionReady = state.status !== 'loading';
      window.__isReplaying = state.isReplaying;
    }
  }, [state.sessionHistory.length, state.status, state.isReplaying]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}
