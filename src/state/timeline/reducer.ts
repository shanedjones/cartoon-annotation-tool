import { TimelineState, TimelineEvent, TimelineMarker } from '../types';
import { Action, createReducer } from '../utils';

// Action Types
export const TIMELINE_ACTIONS = {
  START_RECORDING: 'timeline/startRecording',
  STOP_RECORDING: 'timeline/stopRecording',
  SET_POSITION: 'timeline/setPosition',
  ADD_EVENT: 'timeline/addEvent',
  ADD_MARKER: 'timeline/addMarker',
  CLEAR_EVENTS: 'timeline/clearEvents',
  SET_DURATION: 'timeline/setDuration',
  SET_RECORDING_START_TIME: 'timeline/setRecordingStartTime',
  RESET: 'timeline/reset'
} as const;

// Action Creators
export type TimelineAction = 
  | Action<typeof TIMELINE_ACTIONS.START_RECORDING>
  | Action<typeof TIMELINE_ACTIONS.STOP_RECORDING>
  | Action<typeof TIMELINE_ACTIONS.SET_POSITION, { position: number }>
  | Action<typeof TIMELINE_ACTIONS.ADD_EVENT, { event: TimelineEvent }>
  | Action<typeof TIMELINE_ACTIONS.ADD_MARKER, { marker: TimelineMarker }>
  | Action<typeof TIMELINE_ACTIONS.CLEAR_EVENTS>
  | Action<typeof TIMELINE_ACTIONS.SET_DURATION, { duration: number }>
  | Action<typeof TIMELINE_ACTIONS.SET_RECORDING_START_TIME, { time: number | null }>
  | Action<typeof TIMELINE_ACTIONS.RESET>;

// Initial State
export const initialTimelineState: TimelineState = {
  position: 0,
  duration: 0,
  events: [],
  markers: [],
  isRecording: false,
  recordingStartTime: null,
};

// Reducer
export const timelineReducer = createReducer<TimelineState, TimelineAction>(
  initialTimelineState,
  {
    [TIMELINE_ACTIONS.START_RECORDING]: (state) => ({
      ...state,
      isRecording: true,
      position: 0,
      events: [],
      markers: [],
      recordingStartTime: Date.now(),
    }),
    
    [TIMELINE_ACTIONS.STOP_RECORDING]: (state) => ({
      ...state,
      isRecording: false,
    }),
    
    [TIMELINE_ACTIONS.SET_POSITION]: (state, action) => ({
      ...state,
      position: action.payload?.position || 0,
    }),
    
    [TIMELINE_ACTIONS.ADD_EVENT]: (state, action) => ({
      ...state,
      events: action.payload?.event 
        ? [...state.events, action.payload.event]
        : state.events,
    }),
    
    [TIMELINE_ACTIONS.ADD_MARKER]: (state, action) => ({
      ...state,
      markers: action.payload?.marker 
        ? [...state.markers, action.payload.marker]
        : state.markers,
    }),
    
    [TIMELINE_ACTIONS.CLEAR_EVENTS]: (state) => ({
      ...state,
      events: [],
      markers: [],
    }),
    
    [TIMELINE_ACTIONS.SET_DURATION]: (state, action) => ({
      ...state,
      duration: action.payload?.duration || 0,
    }),
    
    [TIMELINE_ACTIONS.SET_RECORDING_START_TIME]: (state, action) => ({
      ...state,
      recordingStartTime: action.payload?.time ?? null,
    }),
    
    [TIMELINE_ACTIONS.RESET]: () => initialTimelineState,
  }
);
