'use client';
import { createContext, useContext, useReducer, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { DrawingPath, TimelinePosition, Color, StrokeWidth } from '../types';
interface AnnotationState {
  annotations: DrawingPath[];
  lastClearTime: TimelinePosition;
  currentColor: Color;
  currentWidth: StrokeWidth;
  isEnabled: boolean;
  isReplaying: boolean;
}
type AnnotationActionType =
  | { type: 'ADD_ANNOTATION'; payload: { annotation: DrawingPath } }
  | { type: 'CLEAR_ANNOTATIONS'; payload: { clearTime: TimelinePosition } }
  | { type: 'SET_ANNOTATIONS'; payload: { annotations: DrawingPath[] } }
  | { type: 'SET_COLOR'; payload: { color: Color } }
  | { type: 'SET_WIDTH'; payload: { width: StrokeWidth } }
  | { type: 'SET_ENABLED'; payload: { enabled: boolean } }
  | { type: 'SET_REPLAYING'; payload: { replaying: boolean } }
  | { type: 'RESET' };
interface AnnotationContextType {
  state: AnnotationState;
  addAnnotation: (annotation: DrawingPath) => void;
  clearAnnotations: (clearTime: TimelinePosition) => void;
  setAnnotations: (annotations: DrawingPath[]) => void;
  setColor: (color: Color) => void;
  setWidth: (width: StrokeWidth) => void;
  setEnabled: (enabled: boolean) => void;
  setReplaying: (replaying: boolean) => void;
  reset: () => void;
  isAnnotationVisibleAtTime: (annotation: DrawingPath, timePosition: TimelinePosition) => boolean;
  getVisibleAnnotations: (timePosition: TimelinePosition) => DrawingPath[];
}
const initialState: AnnotationState = {
  annotations: [],
  lastClearTime: 0,
  currentColor: '#ffff00',
  currentWidth: 1,
  isEnabled: true,
  isReplaying: false,
};
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
const AnnotationContext = createContext<AnnotationContextType | null>(null);
interface AnnotationProviderProps {
  children: ReactNode;
}
export function AnnotationProvider({ children }: AnnotationProviderProps) {
  const [state, dispatch] = useReducer(annotationReducer, initialState);
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
  const isAnnotationVisibleAtTime = useCallback(
    (annotation: DrawingPath, timePosition: TimelinePosition): boolean => {
      if ('globalTimeOffset' in annotation) {
        const globalTimeOffset = annotation.globalTimeOffset as TimelinePosition;
        if (globalTimeOffset <= state.lastClearTime) {
          return false;
        }
        return globalTimeOffset <= timePosition;
      }
      if ('timeOffset' in annotation) {
        const timeOffset = annotation.timeOffset as TimelinePosition;
        if (timeOffset <= state.lastClearTime) {
          return false;
        }
        return timeOffset <= timePosition;
      }
      if (annotation.videoTime !== undefined) {
        return true;
      }
      return annotation.timestamp <= timePosition;
    },
    [state.lastClearTime]
  );
  const getVisibleAnnotations = useCallback(
    (timePosition: TimelinePosition): DrawingPath[] => {
      return state.annotations.filter(annotation =>
        isAnnotationVisibleAtTime(annotation, timePosition)
      );
    },
    [state.annotations, isAnnotationVisibleAtTime]
  );
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__lastClearTime = state.lastClearTime;
    }
  }, [state.lastClearTime]);
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
export function useAnnotation() {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error('useAnnotation must be used within an AnnotationProvider');
  }
  return context;
}
export function useDrawingOptions() {
  const { state, setColor, setWidth } = useAnnotation();
  return {
    color: state.currentColor,
    width: state.currentWidth,
    setColor,
    setWidth,
  };
}
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