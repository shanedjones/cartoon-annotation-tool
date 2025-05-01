'use client';

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  ReactNode
} from 'react';
import type { DrawingTool } from '../types';

interface DrawingToolsState {
  toolColor: string;
  toolWidth: number;
  toolType: DrawingTool;
  isEnabled: boolean;
  shouldClearCanvas: boolean;
}

type DrawingToolsActionType =
  | { type: 'SET_TOOL_COLOR'; payload: { color: string } }
  | { type: 'SET_TOOL_WIDTH'; payload: { width: number } }
  | { type: 'SET_TOOL_TYPE'; payload: { toolType: DrawingTool } }
  | { type: 'SET_ENABLED'; payload: { isEnabled: boolean } }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'CLEAR_CANVAS_COMPLETE' }
  | { type: 'RESET' };

interface DrawingToolsContextType {
  state: DrawingToolsState;
  setToolColor: (color: string) => void;
  setToolWidth: (width: number) => void;
  setToolType: (toolType: DrawingTool) => void;
  setEnabled: (isEnabled: boolean) => void;
  clearCanvas: () => void;
  clearCanvasComplete: () => void;
  reset: () => void;
}

const initialState: DrawingToolsState = {
  toolColor: '#ffff00',
  toolWidth: 1,
  toolType: 'freehand',
  isEnabled: true,
  shouldClearCanvas: false,
};

function drawingToolsReducer(state: DrawingToolsState, action: DrawingToolsActionType): DrawingToolsState {
  switch (action.type) {
    case 'SET_TOOL_COLOR':
      return {
        ...state,
        toolColor: action.payload.color,
      };
    case 'SET_TOOL_WIDTH':
      return {
        ...state,
        toolWidth: action.payload.width,
      };
    case 'SET_TOOL_TYPE':
      return {
        ...state,
        toolType: action.payload.toolType,
      };
    case 'SET_ENABLED':
      return {
        ...state,
        isEnabled: action.payload.isEnabled,
      };
    case 'CLEAR_CANVAS':
      return {
        ...state,
        shouldClearCanvas: true,
      };
    case 'CLEAR_CANVAS_COMPLETE':
      return {
        ...state,
        shouldClearCanvas: false,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const DrawingToolsContext = createContext<DrawingToolsContextType | null>(null);

interface DrawingToolsProviderProps {
  children: ReactNode;
}

export function DrawingToolsProvider({ children }: DrawingToolsProviderProps) {
  const [state, dispatch] = useReducer(drawingToolsReducer, initialState);

  const actions = useMemo(() => ({
    setToolColor: (color: string) =>
      dispatch({ type: 'SET_TOOL_COLOR', payload: { color } }),
    setToolWidth: (width: number) =>
      dispatch({ type: 'SET_TOOL_WIDTH', payload: { width } }),
    setToolType: (toolType: DrawingTool) =>
      dispatch({ type: 'SET_TOOL_TYPE', payload: { toolType } }),
    setEnabled: (isEnabled: boolean) =>
      dispatch({ type: 'SET_ENABLED', payload: { isEnabled } }),
    clearCanvas: () => dispatch({ type: 'CLEAR_CANVAS' }),
    clearCanvasComplete: () => dispatch({ type: 'CLEAR_CANVAS_COMPLETE' }),
    reset: () => dispatch({ type: 'RESET' }),
  }), []);

  const contextValue = useMemo(() => ({
    state,
    ...actions,
  }), [state, actions]);

  return (
    <DrawingToolsContext.Provider value={contextValue}>
      {children}
    </DrawingToolsContext.Provider>
  );
}

export function useDrawingTools() {
  const context = useContext(DrawingToolsContext);
  if (!context) {
    throw new Error('useDrawingTools must be used within a DrawingToolsProvider');
  }
  return context;
}

export function useDrawingToolsState() {
  const { state } = useDrawingTools();
  return {
    toolColor: state.toolColor,
    toolWidth: state.toolWidth,
    toolType: state.toolType,
    isEnabled: state.isEnabled,
    shouldClearCanvas: state.shouldClearCanvas,
  };
}

export function useDrawingToolsActions() {
  const { setToolColor, setToolWidth, setToolType, setEnabled, clearCanvas } = useDrawingTools();
  return {
    setToolColor,
    setToolWidth,
    setToolType,
    setEnabled,
    clearCanvas,
  };
}