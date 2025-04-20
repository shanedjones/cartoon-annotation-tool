'use client';

import { useContext, useCallback, useMemo } from 'react';
import { SessionContext } from './context';
import { SESSION_ACTIONS } from './reducer';
import { Session, CategoryRating } from '../types';

/**
 * Hook to access session state
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context.state;
}

/**
 * Hook to access session actions
 */
export function useSessionActions() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionActions must be used within a SessionProvider');
  }
  
  const { dispatch } = context;

  // Define all callbacks first, outside of useMemo
  const startRecording = useCallback(
    (videoId: string) => 
      dispatch({ type: SESSION_ACTIONS.START_RECORDING, payload: { videoId } }),
    [dispatch]
  );

  const stopRecording = useCallback(
    (endTime: number, audioUrl?: string) => 
      dispatch({ type: SESSION_ACTIONS.STOP_RECORDING, payload: { endTime, audioUrl } }),
    [dispatch]
  );

  const startReplay = useCallback(
    () => dispatch({ type: SESSION_ACTIONS.START_REPLAY }),
    [dispatch]
  );

  const stopReplay = useCallback(
    () => dispatch({ type: SESSION_ACTIONS.STOP_REPLAY }),
    [dispatch]
  );

  const setCategory = useCallback(
    (categoryId: string, rating: number) => 
      dispatch({ type: SESSION_ACTIONS.SET_CATEGORY, payload: { categoryId, rating } }),
    [dispatch]
  );

  const loadSession = useCallback(
    (session: Session) => 
      dispatch({ type: SESSION_ACTIONS.LOAD_SESSION, payload: { session } }),
    [dispatch]
  );

  const setCategories = useCallback(
    (categories: CategoryRating[]) => 
      dispatch({ type: SESSION_ACTIONS.SET_CATEGORIES, payload: { categories } }),
    [dispatch]
  );

  const clearCategories = useCallback(
    () => dispatch({ type: SESSION_ACTIONS.CLEAR_CATEGORIES }),
    [dispatch]
  );

  const setStatus = useCallback(
    (status: 'idle' | 'loading' | 'recording' | 'replaying' | 'complete' | 'error') => 
      dispatch({ type: SESSION_ACTIONS.SET_STATUS, payload: { status } }),
    [dispatch]
  );

  const reset = useCallback(
    () => dispatch({ type: SESSION_ACTIONS.RESET }),
    [dispatch]
  );

  // Return all the callbacks together
  return useMemo(() => ({
    startRecording,
    stopRecording,
    startReplay,
    stopReplay,
    setCategory,
    loadSession,
    setCategories,
    clearCategories,
    setStatus,
    reset
  }), [
    startRecording,
    stopRecording,
    startReplay,
    stopReplay,
    setCategory,
    loadSession,
    setCategories,
    clearCategories,
    setStatus,
    reset
  ]);
}

/**
 * Helper function to check if a recording session is available
 */
export function useSessionAvailability() {
  const { currentSession, sessionHistory, status } = useSession();
  
  return {
    hasCurrentSession: currentSession !== null,
    hasRecordingHistory: sessionHistory.length > 0,
    isSessionActive: status === 'recording' || status === 'replaying',
  };
}

/**
 * Helper function to access category ratings
 */
export function useCategories() {
  const { categories } = useSession(); // This is actually CategoryRating[], not Category[]
  const { setCategory, clearCategories } = useSessionActions();
  
  return {
    categories,
    setCategory,
    clearCategories,
    getCategoryRating: (categoryId: string) => {
      const category = categories.find(c => c.categoryId === categoryId);
      return category ? category.rating : 0;
    }
  };
}
