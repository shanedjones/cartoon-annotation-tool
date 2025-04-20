'use client';

import React, { createContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
import { AnnotationState, AnnotationPath } from '../types';
import { annotationReducer, initialAnnotationState, AnnotationAction, ANNOTATION_ACTIONS } from './reducer';
import { withDevTools } from '../utils';

// Context type includes both state and dispatch
type AnnotationContextType = {
  state: AnnotationState;
  dispatch: React.Dispatch<AnnotationAction>;
};

// Create the context
export const AnnotationContext = createContext<AnnotationContextType | null>(null);

// Provider props
interface AnnotationProviderProps {
  children: ReactNode;
  initialState?: Partial<AnnotationState>;
}

/**
 * Annotation Provider component
 */
export function AnnotationProvider({ children, initialState }: AnnotationProviderProps) {
  // Initialize reducer with merged initial state and DevTools support
  const [state, dispatch] = useReducer(
    withDevTools(annotationReducer, 'annotation'),
    { ...initialAnnotationState, ...initialState }
  );

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AnnotationContext.Provider value={contextValue}>
      {children}
    </AnnotationContext.Provider>
  );
}
