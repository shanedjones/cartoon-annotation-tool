'use client';

import { createContext, useContext, useReducer, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { DrawingPath, TimelinePosition, Color, StrokeWidth } from '../types';

/**
 * Annotation State Interface
 */
interface AnnotationState {
  // All annotations created in the current session
  annotations: DrawingPath[];
  // Time of the last clear operation in global timeline
  lastClearTime: TimelinePosition;
  // Currently selected color
  currentColor: Color;
  // Currently selected stroke width
  currentWidth: StrokeWidth;
  // Whether annotation is enabled
  isEnabled: boolean;
  // Whether annotation is in replay mode
  isReplaying: boolean;
}

/**
 * Annotation Action Types
 */
type AnnotationActionType = 
  | { type: 'ADD_ANNOTATION'; payload: { annotation: DrawingPath } }
  | { type: 'CLEAR_ANNOTATIONS'; payload: { clearTime: TimelinePosition } }
  | { type: 'SET_ANNOTATIONS'; payload: { annotations: DrawingPath[] } }
  | { type: 'SET_COLOR'; payload: { color: Color } }
  | { type: 'SET_WIDTH'; payload: { width: StrokeWidth } }
  | { type: 'SET_ENABLED'; payload: { enabled: boolean } }
  | { type: 'SET_REPLAYING'; payload: { replaying: boolean } }
  | { type: 'RESET' };

/**
 * Annotation Context Interface
 */
interface AnnotationContextType {
  // Current state
  state: AnnotationState;
  // Action dispatchers
  addAnnotation: (annotation: DrawingPath) => void;
  clearAnnotations: (clearTime: TimelinePosition) => void;
  setAnnotations: (annotations: DrawingPath[]) => void;
  setColor: (color: Color) => void;
  setWidth: (width: StrokeWidth) => void;
  setEnabled: (enabled: boolean) => void;
  setReplaying: (replaying: boolean) => void;
  reset: () => void;
  // Helper functions
  isAnnotationVisibleAtTime: (annotation: DrawingPath, timePosition: TimelinePosition) => boolean;
  getVisibleAnnotations: (timePosition: TimelinePosition) => DrawingPath[];
}

// Initial state
const initialState: AnnotationState = {
  annotations: [],
  lastClearTime: 0,
  currentColor: '#ffff00', // Default yellow
  currentWidth: 1, // Default thin width
  isEnabled: true,
  isReplaying: false,
};

// Annotation reducer
function annotationReducer(state: AnnotationState, action: AnnotationActionType): AnnotationState {
  switch (action.type) {
    case 'ADD_ANNOTATION':
      return {
        ...state,
        annotations: [...state.annotations, action.payload.annotation],
      };

    case 'CLEAR_ANNOTATIONS':
      return {
        ...state,
        lastClearTime: action.payload.clearTime,
      };

    case 'SET_ANNOTATIONS':
      return {
        ...state,
        annotations: action.payload.annotations,
      };

    case 'SET_COLOR':
      return {
        ...state,
        currentColor: action.payload.color,
      };

    case 'SET_WIDTH':
      return {
        ...state,
        currentWidth: action.payload.width,
      };

    case 'SET_ENABLED':
      return {
        ...state,
        isEnabled: action.payload.enabled,
      };

    case 'SET_REPLAYING':
      return {
        ...state,
        isReplaying: action.payload.replaying,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Create the context
const AnnotationContext = createContext<AnnotationContextType | null>(null);

/**
 * Annotation Provider Props
 */
interface AnnotationProviderProps {
  children: ReactNode;
}

/**
 * Annotation Provider Component
 */
export function AnnotationProvider({ children }: AnnotationProviderProps) {
  const [state, dispatch] = useReducer(annotationReducer, initialState);

  // Memoized action creators
  const actions = useMemo(() => ({
    addAnnotation: (annotation: DrawingPath) => 
      dispatch({ type: 'ADD_ANNOTATION', payload: { annotation } }),
    
    clearAnnotations: (clearTime: TimelinePosition) => 
      dispatch({ type: 'CLEAR_ANNOTATIONS', payload: { clearTime } }),
    
    setAnnotations: (annotations: DrawingPath[]) => 
      dispatch({ type: 'SET_ANNOTATIONS', payload: { annotations } }),
    
    setColor: (color: Color) => 
      dispatch({ type: 'SET_COLOR', payload: { color } }),
    
    setWidth: (width: StrokeWidth) => 
      dispatch({ type: 'SET_WIDTH', payload: { width } }),
    
    setEnabled: (enabled: boolean) => 
      dispatch({ type: 'SET_ENABLED', payload: { enabled } }),
    
    setReplaying: (replaying: boolean) => 
      dispatch({ type: 'SET_REPLAYING', payload: { replaying } }),
    
    reset: () => dispatch({ type: 'RESET' }),
  }), []);

  // Helper function to determine if an annotation should be visible at a given time
  const isAnnotationVisibleAtTime = useCallback(
    (annotation: DrawingPath, timePosition: TimelinePosition): boolean => {
      // First priority: check globalTimeOffset
      if ('globalTimeOffset' in annotation) {
        const globalTimeOffset = annotation.globalTimeOffset as TimelinePosition;
        
        // Skip annotations that were drawn before the last clear
        if (globalTimeOffset <= state.lastClearTime) {
          return false;
        }
        
        // Show annotation if it was created before or at the current time
        return globalTimeOffset <= timePosition;
      }
      
      // Second priority: check timeOffset
      if ('timeOffset' in annotation) {
        const timeOffset = annotation.timeOffset as TimelinePosition;
        
        // Skip annotations drawn before the last clear
        if (timeOffset <= state.lastClearTime) {
          return false;
        }
        
        return timeOffset <= timePosition;
      }
      
      // Fallback to videoTime for legacy support
      if (annotation.videoTime !== undefined) {
        return true; // Simplified for now, would need video position context for full implementation
      }
      
      // Last resort: use timestamp
      return annotation.timestamp <= timePosition;
    },
    [state.lastClearTime]
  );

  // Get all annotations that should be visible at a given time
  const getVisibleAnnotations = useCallback(
    (timePosition: TimelinePosition): DrawingPath[] => {
      return state.annotations.filter(annotation => 
        isAnnotationVisibleAtTime(annotation, timePosition)
      );
    },
    [state.annotations, isAnnotationVisibleAtTime]
  );

  // Synchronize with window globals when needed for backward compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__lastClearTime = state.lastClearTime;
    }
  }, [state.lastClearTime]);

  // Provide the context value
  const contextValue = useMemo(() => ({
    state,
    ...actions,
    isAnnotationVisibleAtTime,
    getVisibleAnnotations,
  }), [state, actions, isAnnotationVisibleAtTime, getVisibleAnnotations]);

  return (
    <AnnotationContext.Provider value={contextValue}>
      {children}
    </AnnotationContext.Provider>
  );
}

/**
 * Custom hook to use the annotation context
 */
export function useAnnotation() {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error('useAnnotation must be used within an AnnotationProvider');
  }
  return context;
}

/**
 * Custom hook to get current drawing options
 */
export function useDrawingOptions() {
  const { state, setColor, setWidth } = useAnnotation();
  return {
    color: state.currentColor,
    width: state.currentWidth,
    setColor,
    setWidth,
  };
}

/**
 * Custom hook to manage annotations
 */
export function useAnnotationManager() {
  const { 
    state, 
    addAnnotation, 
    clearAnnotations, 
    setAnnotations, 
    getVisibleAnnotations 
  } = useAnnotation();
  
  return {
    annotations: state.annotations,
    lastClearTime: state.lastClearTime,
    isEnabled: state.isEnabled,
    isReplaying: state.isReplaying,
    addAnnotation,
    clearAnnotations,
    setAnnotations,
    getVisibleAnnotations,
  };
}