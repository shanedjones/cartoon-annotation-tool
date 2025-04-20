import { AuthState } from '../types';
import { Action, createReducer } from '../utils';

// Action Types
export const AUTH_ACTIONS = {
  SET_USER: 'auth/setUser',
  SET_STATUS: 'auth/setStatus',
  SET_ERROR: 'auth/setError',
  SIGN_OUT: 'auth/signOut',
  SIGN_IN_START: 'auth/signInStart',
  SIGN_IN_SUCCESS: 'auth/signInSuccess',
  SIGN_IN_FAILURE: 'auth/signInFailure',
} as const;

// Action Creators
export type AuthAction = 
  | Action<typeof AUTH_ACTIONS.SET_USER, { user: AuthState['user'] }>
  | Action<typeof AUTH_ACTIONS.SET_STATUS, { status: AuthState['status'] }>
  | Action<typeof AUTH_ACTIONS.SET_ERROR, { error: string }>
  | Action<typeof AUTH_ACTIONS.SIGN_OUT>
  | Action<typeof AUTH_ACTIONS.SIGN_IN_START>
  | Action<typeof AUTH_ACTIONS.SIGN_IN_SUCCESS, { user: AuthState['user'] }>
  | Action<typeof AUTH_ACTIONS.SIGN_IN_FAILURE, { error: string }>;

// Initial State
export const initialAuthState: AuthState = {
  user: null,
  status: 'loading',
  error: undefined,
};

// Reducer
export const authReducer = createReducer<AuthState, AuthAction>(
  initialAuthState,
  {
    [AUTH_ACTIONS.SET_USER]: (state, action) => ({
      ...state,
      user: action.payload?.user || null,
      status: action.payload?.user ? 'authenticated' : 'unauthenticated',
    }),
    
    [AUTH_ACTIONS.SET_STATUS]: (state, action) => ({
      ...state,
      status: action.payload?.status || 'unauthenticated',
    }),
    
    [AUTH_ACTIONS.SET_ERROR]: (state, action) => ({
      ...state,
      status: 'error',
      error: action.payload?.error,
    }),
    
    [AUTH_ACTIONS.SIGN_OUT]: (state) => ({
      ...state,
      user: null,
      status: 'unauthenticated',
      error: undefined,
    }),

    [AUTH_ACTIONS.SIGN_IN_START]: (state) => ({
      ...state,
      status: 'loading',
      error: undefined,
    }),

    [AUTH_ACTIONS.SIGN_IN_SUCCESS]: (state, action) => ({
      ...state,
      user: action.payload?.user || null,
      status: 'authenticated',
      error: undefined,
    }),

    [AUTH_ACTIONS.SIGN_IN_FAILURE]: (state, action) => ({
      ...state,
      status: 'error',
      error: action.payload?.error,
    }),
  }
);
