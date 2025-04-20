import { SessionState, Session, CategoryRating } from '../types';
import { Action, createReducer } from '../utils';
import { v4 as uuidv4 } from 'uuid';

// Action Types
export const SESSION_ACTIONS = {
  START_RECORDING: 'session/startRecording',
  STOP_RECORDING: 'session/stopRecording',
  START_REPLAY: 'session/startReplay',
  STOP_REPLAY: 'session/stopReplay',
  SET_CATEGORY: 'session/setCategory',
  LOAD_SESSION: 'session/loadSession',
  SET_CATEGORIES: 'session/setCategories',
  CLEAR_CATEGORIES: 'session/clearCategories',
  SET_STATUS: 'session/setStatus',
  RESET: 'session/reset'
} as const;

// Action Creators
export type SessionAction = 
  | Action<typeof SESSION_ACTIONS.START_RECORDING, { videoId: string }>
  | Action<typeof SESSION_ACTIONS.STOP_RECORDING, { endTime: number, audioUrl?: string }>
  | Action<typeof SESSION_ACTIONS.START_REPLAY>
  | Action<typeof SESSION_ACTIONS.STOP_REPLAY>
  | Action<typeof SESSION_ACTIONS.SET_CATEGORY, { categoryId: string, rating: number }>
  | Action<typeof SESSION_ACTIONS.LOAD_SESSION, { session: Session }>
  | Action<typeof SESSION_ACTIONS.SET_CATEGORIES, { categories: CategoryRating[] }>
  | Action<typeof SESSION_ACTIONS.CLEAR_CATEGORIES>
  | Action<typeof SESSION_ACTIONS.SET_STATUS, { status: 'idle' | 'loading' | 'recording' | 'replaying' | 'complete' | 'error' }>
  | Action<typeof SESSION_ACTIONS.RESET>;

// Initial State
export const initialSessionState: SessionState = {
  currentSession: null,
  sessionHistory: [],
  isRecording: false,
  isReplaying: false,
  categories: [],
  status: 'idle',
};

// Reducer
export const sessionReducer = createReducer<SessionState, SessionAction>(
  initialSessionState,
  {
    [SESSION_ACTIONS.START_RECORDING]: (state, action) => {
      const sessionId = uuidv4();
      const newSession: Session = {
        id: sessionId,
        videoId: action.payload?.videoId || '',
        userId: '', // Will be filled in later
        startTime: Date.now(),
        categories: [],
        annotations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return {
        ...state,
        currentSession: newSession,
        isRecording: true,
        isReplaying: false,
        status: 'recording',
      };
    },
    
    [SESSION_ACTIONS.STOP_RECORDING]: (state, action) => ({
      ...state,
      currentSession: state.currentSession 
        ? {
            ...state.currentSession,
            endTime: action.payload?.endTime,
            audioUrl: action.payload?.audioUrl,
            updatedAt: new Date().toISOString(),
          }
        : null,
      isRecording: false,
      sessionHistory: state.currentSession 
        ? [...state.sessionHistory, {
            ...state.currentSession,
            endTime: action.payload?.endTime,
            audioUrl: action.payload?.audioUrl,
            updatedAt: new Date().toISOString(),
          }]
        : state.sessionHistory,
      status: 'idle',
    }),
    
    [SESSION_ACTIONS.START_REPLAY]: (state) => ({
      ...state,
      isReplaying: true,
      isRecording: false,
      status: 'replaying',
    }),
    
    [SESSION_ACTIONS.STOP_REPLAY]: (state) => ({
      ...state,
      isReplaying: false,
      status: 'idle',
    }),
    
    [SESSION_ACTIONS.SET_CATEGORY]: (state, action) => {
      const categoryId = action.payload?.categoryId || '';
      const rating = action.payload?.rating || 0;
      
      // Check if category already exists
      const existingIndex = state.categories.findIndex(c => c.categoryId === categoryId);
      let newCategories;
      
      if (existingIndex >= 0) {
        // Update existing category
        newCategories = [...state.categories];
        newCategories[existingIndex] = { categoryId, rating };
      } else {
        // Add new category
        newCategories = [...state.categories, { categoryId, rating }];
      }
      
      return {
        ...state,
        categories: newCategories,
      };
    },
    
    [SESSION_ACTIONS.LOAD_SESSION]: (state, action) => ({
      ...state,
      currentSession: action.payload?.session || null,
      status: 'idle',
    }),
    
    [SESSION_ACTIONS.SET_CATEGORIES]: (state, action) => ({
      ...state,
      categories: action.payload?.categories || [],
    }),
    
    [SESSION_ACTIONS.CLEAR_CATEGORIES]: (state) => ({
      ...state,
      categories: [],
    }),
    
    [SESSION_ACTIONS.SET_STATUS]: (state, action) => ({
      ...state,
      status: (action.payload?.status || 'idle') as 'idle' | 'loading' | 'recording' | 'replaying' | 'complete' | 'error',
    }),
    
    [SESSION_ACTIONS.RESET]: () => initialSessionState,
  }
);
