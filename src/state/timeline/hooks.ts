'use client';

import { useContext, useCallback, useMemo } from 'react';
import { TimelineContext } from './context';
import { TIMELINE_ACTIONS } from './reducer';
import { TimelineEvent, TimelineMarker } from '../types';

/**
 * Hook to access timeline state
 */
export function useTimeline() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context.state;
}

/**
 * Hook to access timeline actions
 */
export function useTimelineActions() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimelineActions must be used within a TimelineProvider');
  }
  
  const { dispatch } = context;

  // Define callbacks individually first
  const startRecording = useCallback(
    () => dispatch({ type: TIMELINE_ACTIONS.START_RECORDING }),
    [dispatch]
  );

  const stopRecording = useCallback(
    () => dispatch({ type: TIMELINE_ACTIONS.STOP_RECORDING }),
    [dispatch]
  );

  const setPosition = useCallback(
    (position: number) => 
      dispatch({ type: TIMELINE_ACTIONS.SET_POSITION, payload: { position } }),
    [dispatch]
  );

  const addEvent = useCallback(
    (event: TimelineEvent) => 
      dispatch({ type: TIMELINE_ACTIONS.ADD_EVENT, payload: { event } }),
    [dispatch]
  );

  const addMarker = useCallback(
    (marker: TimelineMarker) => 
      dispatch({ type: TIMELINE_ACTIONS.ADD_MARKER, payload: { marker } }),
    [dispatch]
  );

  const clearEvents = useCallback(
    () => dispatch({ type: TIMELINE_ACTIONS.CLEAR_EVENTS }),
    [dispatch]
  );

  const setDuration = useCallback(
    (duration: number) => 
      dispatch({ type: TIMELINE_ACTIONS.SET_DURATION, payload: { duration } }),
    [dispatch]
  );

  const setRecordingStartTime = useCallback(
    (time: number | null) => 
      dispatch({ type: TIMELINE_ACTIONS.SET_RECORDING_START_TIME, payload: { time } }),
    [dispatch]
  );

  const reset = useCallback(
    () => dispatch({ type: TIMELINE_ACTIONS.RESET }),
    [dispatch]
  );

  // Return an object with all the actions
  return {
    startRecording,
    stopRecording,
    setPosition,
    addEvent,
    addMarker,
    clearEvents,
    setDuration,
    setRecordingStartTime,
    reset
  };
}

/**
 * Hook to get current timeline position
 */
export function useTimelinePosition() {
  const timeline = useTimeline();
  const actions = useTimelineActions();
  
  return {
    position: timeline.position,
    setPosition: actions.setPosition
  };
}

/**
 * Hook to calculate the current time relative to recording start
 */
export function useRecordingTime() {
  const timeline = useTimeline();
  
  if (!timeline.recordingStartTime || !timeline.isRecording) {
    return 0;
  }
  
  return Date.now() - timeline.recordingStartTime;
}
