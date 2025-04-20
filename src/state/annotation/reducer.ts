import { AnnotationState, AnnotationPath, AnnotationTool, Point } from '../types';
import { Action, createReducer } from '../utils';

// Action Types
export const ANNOTATION_ACTIONS = {
  ADD_PATH: 'annotation/addPath',
  REMOVE_PATH: 'annotation/removePath',
  CLEAR_PATHS: 'annotation/clearPaths',
  SET_TOOL: 'annotation/setTool',
  SET_COLOR: 'annotation/setColor',
  SET_STROKE_WIDTH: 'annotation/setStrokeWidth',
  TOGGLE_VISIBILITY: 'annotation/toggleVisibility',
  SET_TEMPORAL_VISIBILITY: 'annotation/setTemporalVisibility',
  SET_LAST_CLEAR_TIME: 'annotation/setLastClearTime',
  RESET: 'annotation/reset'
} as const;

// Action Creators
export type AnnotationAction = 
  | Action<typeof ANNOTATION_ACTIONS.ADD_PATH, { path: AnnotationPath }>
  | Action<typeof ANNOTATION_ACTIONS.REMOVE_PATH, { id: string }>
  | Action<typeof ANNOTATION_ACTIONS.CLEAR_PATHS, { clearTime?: number }>
  | Action<typeof ANNOTATION_ACTIONS.SET_TOOL, { tool: AnnotationTool }>
  | Action<typeof ANNOTATION_ACTIONS.SET_COLOR, { color: string }>
  | Action<typeof ANNOTATION_ACTIONS.SET_STROKE_WIDTH, { width: number }>
  | Action<typeof ANNOTATION_ACTIONS.TOGGLE_VISIBILITY, { visible?: boolean }>
  | Action<typeof ANNOTATION_ACTIONS.SET_TEMPORAL_VISIBILITY, { enabled: boolean }>
  | Action<typeof ANNOTATION_ACTIONS.SET_LAST_CLEAR_TIME, { time: number }>
  | Action<typeof ANNOTATION_ACTIONS.RESET>;

// Initial State
export const initialAnnotationState: AnnotationState = {
  paths: [],
  currentTool: 'pen',
  strokeWidth: 2,
  color: '#ff0000',
  isVisible: true,
  temporalVisibility: true,
  lastClearTime: 0,
};

// Reducer
export const annotationReducer = createReducer<AnnotationState, AnnotationAction>(
  initialAnnotationState,
  {
    [ANNOTATION_ACTIONS.ADD_PATH]: (state, action) => ({
      ...state,
      paths: action.payload?.path 
        ? [...state.paths, action.payload.path]
        : state.paths,
    }),
    
    [ANNOTATION_ACTIONS.REMOVE_PATH]: (state, action) => ({
      ...state,
      paths: state.paths.filter(path => path.id !== action.payload?.id),
    }),
    
    [ANNOTATION_ACTIONS.CLEAR_PATHS]: (state, action) => {
      // If clearTime is provided, mark this as a temporal clear point
      // and keep the paths for selective visibility
      const clearTime = action.payload?.clearTime;
      if (clearTime !== undefined && state.temporalVisibility) {
        if (typeof window !== 'undefined') {
          window.__lastClearTime = clearTime;
        }
        return state;
      }
      
      // Otherwise, actually clear the paths
      return {
        ...state,
        paths: [],
      };
    },
    
    [ANNOTATION_ACTIONS.SET_TOOL]: (state, action) => ({
      ...state,
      currentTool: action.payload?.tool || 'pen',
    }),
    
    [ANNOTATION_ACTIONS.SET_COLOR]: (state, action) => ({
      ...state,
      color: action.payload?.color || '#ff0000',
    }),
    
    [ANNOTATION_ACTIONS.SET_STROKE_WIDTH]: (state, action) => ({
      ...state,
      strokeWidth: action.payload?.width || 2,
    }),
    
    [ANNOTATION_ACTIONS.TOGGLE_VISIBILITY]: (state, action) => ({
      ...state,
      isVisible: action.payload?.visible !== undefined ? action.payload.visible : !state.isVisible,
    }),
    
    [ANNOTATION_ACTIONS.SET_TEMPORAL_VISIBILITY]: (state, action) => ({
      ...state,
      temporalVisibility: action.payload?.enabled || false,
    }),
    
    [ANNOTATION_ACTIONS.SET_LAST_CLEAR_TIME]: (state, action) => {
      const time = action.payload?.time || 0;
      // Also sync with window globals for backward compatibility
      if (typeof window !== 'undefined') {
        window.__lastClearTime = time;
      }
      return {
        ...state,
        lastClearTime: time,
      };
    },
    
    [ANNOTATION_ACTIONS.RESET]: () => initialAnnotationState,
  }
);
