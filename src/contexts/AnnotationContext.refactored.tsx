'use client';

import { ReactNode, useEffect } from 'react';
import { createAnnotationContext } from './factory/annotationFactory';

// Create the context using the factory
const { 
  Provider: AnnotationContextProvider, 
  useAnnotation,
  useDrawingOptions,
  useAnnotationManager
} = createAnnotationContext();

/**
 * Annotation Provider Props
 */
interface AnnotationProviderProps {
  children: ReactNode;
}

/**
 * Annotation Provider Component
 * Adds window synchronization for backward compatibility
 */
export function AnnotationProvider({ children }: AnnotationProviderProps) {
  const { state } = useAnnotation();

  // Synchronize with window globals when needed for backward compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__lastClearTime = state.lastClearTime;
    }
  }, [state.lastClearTime]);

  return <AnnotationContextProvider>{children}</AnnotationContextProvider>;
}

// Export hooks
export { useAnnotation, useDrawingOptions, useAnnotationManager };