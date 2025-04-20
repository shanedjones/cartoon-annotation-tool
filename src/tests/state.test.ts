/**
 * Simple unit tests for the state management system
 * 
 * These tests verify that the reducers work as expected
 * and state updates properly based on actions.
 */

import { AuthState } from '../state/types';
import { authReducer, initialAuthState, AUTH_ACTIONS } from '../state/auth/reducer';
import { timelineReducer, initialTimelineState, TIMELINE_ACTIONS } from '../state/timeline/reducer';
import { sessionReducer, initialSessionState, SESSION_ACTIONS } from '../state/session/reducer';
import { annotationReducer, initialAnnotationState, ANNOTATION_ACTIONS } from '../state/annotation/reducer';
import { mediaReducer, initialMediaState, MEDIA_ACTIONS } from '../state/media/reducer';

describe('Auth State', () => {
  test('should handle SET_USER action', () => {
    const mockUser = { id: 'test-user', email: 'test@example.com' };
    const action = { type: AUTH_ACTIONS.SET_USER, payload: { user: mockUser } };
    const newState = authReducer(initialAuthState, action);
    
    expect(newState.user).toEqual(mockUser);
    expect(newState.status).toEqual('authenticated');
  });
  
  test('should handle SIGN_OUT action', () => {
    const initialState: AuthState = {
      ...initialAuthState,
      user: { id: 'test-user', email: 'test@example.com' },
      status: 'authenticated'
    };
    
    const action = { type: AUTH_ACTIONS.SIGN_OUT };
    const newState = authReducer(initialState, action);
    
    expect(newState.user).toBeNull();
    expect(newState.status).toEqual('unauthenticated');
  });
});

describe('Timeline State', () => {
  test('should handle SET_POSITION action', () => {
    const action = { type: TIMELINE_ACTIONS.SET_POSITION, payload: { position: 500 } };
    const newState = timelineReducer(initialTimelineState, action);
    
    expect(newState.position).toEqual(500);
  });
  
  test('should handle ADD_EVENT action', () => {
    const event = { id: 'test-event', time: 100, type: 'test' };
    const action = { type: TIMELINE_ACTIONS.ADD_EVENT, payload: { event } };
    const newState = timelineReducer(initialTimelineState, action);
    
    expect(newState.events).toHaveLength(1);
    expect(newState.events[0]).toEqual(event);
  });
});

describe('Session State', () => {
  test('should handle START_RECORDING action', () => {
    const action = { type: SESSION_ACTIONS.START_RECORDING, payload: { videoId: 'test-video' } };
    const newState = sessionReducer(initialSessionState, action);
    
    expect(newState.isRecording).toBe(true);
    expect(newState.status).toBe('recording');
    expect(newState.currentSession).toBeTruthy();
    expect(newState.currentSession?.videoId).toBe('test-video');
  });
  
  test('should handle STOP_RECORDING action', () => {
    const initialState = {
      ...initialSessionState,
      isRecording: true,
      status: 'recording',
      currentSession: {
        id: 'test-session',
        videoId: 'test-video',
        startTime: 1000,
        categories: [],
        annotations: [],
        createdAt: '',
        updatedAt: '',
        userId: ''
      }
    };
    
    const action = { type: SESSION_ACTIONS.STOP_RECORDING, payload: { endTime: 2000 } };
    const newState = sessionReducer(initialState, action);
    
    expect(newState.isRecording).toBe(false);
    expect(newState.status).toBe('idle');
    expect(newState.currentSession?.endTime).toBe(2000);
    expect(newState.sessionHistory).toHaveLength(1);
  });
});

describe('Annotation State', () => {
  test('should handle SET_TOOL action', () => {
    const action = { type: ANNOTATION_ACTIONS.SET_TOOL, payload: { tool: 'line' } };
    const newState = annotationReducer(initialAnnotationState, action);
    
    expect(newState.currentTool).toBe('line');
  });
  
  test('should handle TOGGLE_VISIBILITY action', () => {
    const action = { type: ANNOTATION_ACTIONS.TOGGLE_VISIBILITY };
    const newState = annotationReducer(initialAnnotationState, action);
    
    expect(newState.isVisible).toBe(!initialAnnotationState.isVisible);
  });
});

describe('Media State', () => {
  test('should handle VIDEO_PLAY action', () => {
    const action = { type: MEDIA_ACTIONS.VIDEO_PLAY };
    const newState = mediaReducer(initialMediaState, action);
    
    expect(newState.video.isPlaying).toBe(true);
  });
  
  test('should handle VIDEO_SET_URL action', () => {
    const url = 'https://example.com/video.mp4';
    const action = { type: MEDIA_ACTIONS.VIDEO_SET_URL, payload: { url } };
    const newState = mediaReducer(initialMediaState, action);
    
    expect(newState.video.currentSrc).toBe(url);
    expect(newState.video.status).toBe('loading');
  });
});