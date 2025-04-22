'use client';

import { useCallback } from 'react';
import { createReducerContext } from './createReducerContext';

/**
 * Session State Interface
 */
export interface SessionState {
  sessionId: string | null;
  userId: string | null;
  started: boolean;
  startTime: number | null;
  endTime: number | null;
  metadata: Record<string, any>;
  isDirty: boolean;
}

/**
 * Session Action Types
 */
export type SessionAction = 
  | { type: 'START_SESSION'; payload: { sessionId: string; userId: string } }
  | { type: 'END_SESSION' }
  | { type: 'SET_METADATA'; payload: { key: string; value: any } }
  | { type: 'SET_METADATA_BATCH'; payload: { metadata: Record<string, any> } }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' }
  | { type: 'RESET' };

// Initial state
const initialSessionState: SessionState = {
  sessionId: null,
  userId: null,
  started: false,
  startTime: null,
  endTime: null,
  metadata: {},
  isDirty: false,
};

// Session reducer
function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        userId: action.payload.userId,
        started: true,
        startTime: Date.now(),
        endTime: null,
        isDirty: true,
      };

    case 'END_SESSION':
      return {
        ...state,
        endTime: Date.now(),
        isDirty: true,
      };

    case 'SET_METADATA':
      return {
        ...state,
        metadata: {
          ...state.metadata,
          [action.payload.key]: action.payload.value,
        },
        isDirty: true,
      };

    case 'SET_METADATA_BATCH':
      return {
        ...state,
        metadata: {
          ...state.metadata,
          ...action.payload.metadata,
        },
        isDirty: true,
      };

    case 'MARK_DIRTY':
      return {
        ...state,
        isDirty: true,
      };

    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false,
      };

    case 'RESET':
      return initialSessionState;

    default:
      return state;
  }
}

// Action creators
const sessionActionCreators = {
  startSession: (sessionId: string, userId: string) => 
    ({ type: 'START_SESSION', payload: { sessionId, userId } } as const),
  
  endSession: () => ({ type: 'END_SESSION' } as const),
  
  setMetadata: (key: string, value: any) => 
    ({ type: 'SET_METADATA', payload: { key, value } } as const),
  
  setMetadataBatch: (metadata: Record<string, any>) => 
    ({ type: 'SET_METADATA_BATCH', payload: { metadata } } as const),
  
  markDirty: () => ({ type: 'MARK_DIRTY' } as const),
  
  markClean: () => ({ type: 'MARK_CLEAN' } as const),
  
  reset: () => ({ type: 'RESET' } as const),
};

// Create the context factory function
export function createSessionContext() {
  const context = createReducerContext<SessionState, SessionAction>(
    'Session',
    sessionReducer,
    initialSessionState,
    sessionActionCreators
  );

  // Extended hook with session-specific functionality
  const useSessionExtended = () => {
    const contextValue = context.useContextHook();
    const { state } = contextValue;

    // Check if session is active
    const isActive = useCallback(() => {
      return state.started && !state.endTime;
    }, [state.started, state.endTime]);

    // Get session duration in milliseconds
    const getDuration = useCallback(() => {
      if (!state.startTime) return 0;
      const endTime = state.endTime || Date.now();
      return endTime - state.startTime;
    }, [state.startTime, state.endTime]);

    // Save session to server
    const saveSession = useCallback(async () => {
      if (!state.sessionId || !state.userId) return;
      
      try {
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: state.sessionId,
            userId: state.userId,
            startTime: state.startTime,
            endTime: state.endTime,
            metadata: state.metadata,
          }),
        });
        
        if (response.ok) {
          contextValue.markClean();
        }
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }, [state, contextValue]);

    return {
      ...contextValue,
      isActive,
      getDuration,
      saveSession,
    };
  };

  return {
    ...context,
    useSession: useSessionExtended,
  };
}