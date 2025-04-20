'use client';

import { useContext, useCallback, useMemo } from 'react';
import { AnnotationContext } from './context';
import { ANNOTATION_ACTIONS } from './reducer';
import { AnnotationPath, AnnotationTool, Point } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook to access annotation state
 */
export function useAnnotation() {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error('useAnnotation must be used within an AnnotationProvider');
  }
  return context.state;
}

/**
 * Hook to access annotation actions
 */
export function useAnnotationActions() {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error('useAnnotationActions must be used within an AnnotationProvider');
  }
  
  const { dispatch } = context;
  const { color, strokeWidth, currentTool } = context.state;

  // Define callbacks individually
  const addPath = useCallback(
    (points: Point[], startTime: number) => {
      const path: AnnotationPath = {
        id: uuidv4(),
        points,
        startTime,
        color,
        strokeWidth,
        tool: currentTool,
        isVisible: true,
      };
      dispatch({ type: ANNOTATION_ACTIONS.ADD_PATH, payload: { path } });
      return path;
    },
    [dispatch, color, strokeWidth, currentTool]
  );
  
  // Alias for addPath for compatibility with FeedbackOrchestrator
  const addAnnotation = useCallback(
    (annotation: any) => {
      // Extract needed properties from the annotation parameter
      const { points, timeOffset, videoTime, tool, color: annotColor, width } = annotation;
      const startTime = timeOffset || videoTime || Date.now();
      const useColor = annotColor || color;
      const useWidth = width || strokeWidth;
      const useTool = tool || currentTool;
      
      const path: AnnotationPath = {
        id: uuidv4(),
        points: points || [],
        startTime,
        color: useColor,
        strokeWidth: useWidth,
        tool: useTool,
        isVisible: true,
      };
      dispatch({ type: ANNOTATION_ACTIONS.ADD_PATH, payload: { path } });
      return path;
    },
    [dispatch, color, strokeWidth, currentTool]
  );

  const removePath = useCallback(
    (id: string) => 
      dispatch({ type: ANNOTATION_ACTIONS.REMOVE_PATH, payload: { id } }),
    [dispatch]
  );

  const clearPaths = useCallback(
    (clearTime?: number) => 
      dispatch({ type: ANNOTATION_ACTIONS.CLEAR_PATHS, payload: { clearTime } }),
    [dispatch]
  );
  
  // Alias for clearPaths for compatibility with FeedbackOrchestrator
  const clearAnnotations = useCallback(
    () => dispatch({ type: ANNOTATION_ACTIONS.CLEAR_PATHS }),
    [dispatch]
  );

  const setTool = useCallback(
    (tool: AnnotationTool) => 
      dispatch({ type: ANNOTATION_ACTIONS.SET_TOOL, payload: { tool } }),
    [dispatch]
  );

  const setColor = useCallback(
    (color: string) => 
      dispatch({ type: ANNOTATION_ACTIONS.SET_COLOR, payload: { color } }),
    [dispatch]
  );

  const setStrokeWidth = useCallback(
    (width: number) => 
      dispatch({ type: ANNOTATION_ACTIONS.SET_STROKE_WIDTH, payload: { width } }),
    [dispatch]
  );

  const toggleVisibility = useCallback(
    (visible?: boolean) => 
      dispatch({ type: ANNOTATION_ACTIONS.TOGGLE_VISIBILITY, payload: { visible } }),
    [dispatch]
  );

  const setTemporalVisibility = useCallback(
    (enabled: boolean) => 
      dispatch({ type: ANNOTATION_ACTIONS.SET_TEMPORAL_VISIBILITY, payload: { enabled } }),
    [dispatch]
  );

  const setLastClearTime = useCallback(
    (time: number) => 
      dispatch({ type: ANNOTATION_ACTIONS.SET_LAST_CLEAR_TIME, payload: { time } }),
    [dispatch]
  );

  const reset = useCallback(
    () => dispatch({ type: ANNOTATION_ACTIONS.RESET }),
    [dispatch]
  );

  // Return object with all actions
  return {
    addPath,
    addAnnotation,
    removePath,
    clearPaths,
    clearAnnotations,
    setTool,
    setColor,
    setStrokeWidth,
    toggleVisibility,
    setTemporalVisibility,
    setLastClearTime,
    reset
  };
}

/**
 * Helper function to determine if an annotation should be visible at a given time
 */
export function useVisibleAnnotations(currentTimePosition: number) {
  const annotation = useAnnotation();
  
  // If annotations are not visible at all, return empty array
  if (!annotation.isVisible) {
    return [];
  }
  
  // If temporal visibility is disabled, return all paths
  if (!annotation.temporalVisibility) {
    return annotation.paths;
  }
  
  // Otherwise, filter by time, using the state's lastClearTime
  return annotation.paths.filter(path => {
    // Skip annotations that were drawn before the last clear
    if (path.startTime <= annotation.lastClearTime) {
      return false;
    }
    
    // Show annotation if it was created before or at the current time
    return path.startTime <= currentTimePosition;
  });
}
