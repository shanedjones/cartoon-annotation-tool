'use client';

import { useContext, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { MediaContext } from './context';
import { MEDIA_ACTIONS } from './reducer';

/**
 * Hook to access media state
 */
export function useMedia() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context.state;
}

/**
 * Hook to get just the video state
 */
export function useVideo() {
  return useMedia().video;
}

/**
 * Hook to get just the audio state
 */
export function useAudio() {
  return useMedia().audio;
}

/**
 * Hook to access media actions
 */
export function useMediaActions() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMediaActions must be used within a MediaProvider');
  }
  
  const { dispatch, videoRef } = context;

  // Define video action creators individually with useCallback to prevent unnecessary re-renders
  const play = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    dispatch({ type: MEDIA_ACTIONS.VIDEO_PLAY });
  }, [videoRef, dispatch]);

  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    dispatch({ type: MEDIA_ACTIONS.VIDEO_PAUSE });
  }, [videoRef, dispatch]);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    dispatch({ type: MEDIA_ACTIONS.VIDEO_SEEK, payload: { time } });
  }, [videoRef, dispatch]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    dispatch({ type: MEDIA_ACTIONS.VIDEO_SET_PLAYBACK_RATE, payload: { rate } });
  }, [videoRef, dispatch]);

  const setMuted = useCallback((muted: boolean) => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
    dispatch({ type: MEDIA_ACTIONS.VIDEO_SET_MUTED, payload: { muted } });
  }, [videoRef, dispatch]);

  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    dispatch({ type: MEDIA_ACTIONS.VIDEO_SET_VOLUME, payload: { volume } });
  }, [videoRef, dispatch]);

  const setVideoUrl = useCallback((url: string) => {
    dispatch({ type: MEDIA_ACTIONS.VIDEO_SET_URL, payload: { url } });
  }, [dispatch]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play().catch(() => {});
      dispatch({ type: MEDIA_ACTIONS.VIDEO_PLAY });
    } else {
      video.pause();
      dispatch({ type: MEDIA_ACTIONS.VIDEO_PAUSE });
    }
  }, [videoRef, dispatch]);
  
  // Group video actions
  const videoActions = useMemo(
    () => ({
      play,
      pause,
      seek,
      setPlaybackRate,
      setMuted,
      setVolume,
      setVideoUrl,
      togglePlay
    }),
    [play, pause, seek, setPlaybackRate, setMuted, setVolume, setVideoUrl, togglePlay]
  );

  // Audio recording state and refs
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Define audio action creators individually with useCallback
  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create media recorder
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      setMediaRecorder(recorder);
      
      // Set up data handling
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          dispatch({ 
            type: MEDIA_ACTIONS.AUDIO_ADD_CHUNK, 
            payload: { chunk: event.data } 
          });
        }
      };
      
      // Start recording
      recorder.start(1000); // Collect data every second
      dispatch({ type: MEDIA_ACTIONS.AUDIO_START_RECORDING });
    } catch (error) {
      console.error('Error starting recording:', error);
      dispatch({ 
        type: MEDIA_ACTIONS.AUDIO_SET_ERROR, 
        payload: { error: 'Could not access microphone' } 
      });
    }
  }, [dispatch]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;
    
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      dispatch({ type: MEDIA_ACTIONS.AUDIO_STOP_RECORDING });
    }
    
    // Stop all audio tracks
    if (stream) {
      stream.getAudioTracks().forEach(track => track.stop());
    }
    
    // Clean up refs
    mediaRecorderRef.current = null;
    streamRef.current = null;
    setMediaRecorder(null);
  }, [dispatch]);

  const clearAudioChunks = useCallback(() => {
    dispatch({ type: MEDIA_ACTIONS.AUDIO_CLEAR_CHUNKS });
  }, [dispatch]);
  
  const setAudioStatus = useCallback((status: 'idle' | 'recording' | 'processing' | 'ready' | 'error') => {
    dispatch({ 
      type: MEDIA_ACTIONS.AUDIO_SET_STATUS,
      payload: { status }
    });
  }, [dispatch]);
  
  // Group audio actions
  const audioActions = useMemo(
    () => ({
      startRecording,
      stopRecording,
      clearAudioChunks,
      setAudioStatus
    }),
    [startRecording, stopRecording, clearAudioChunks, setAudioStatus]
  );

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      const stream = streamRef.current;
      
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      
      if (stream) {
        stream.getAudioTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Define global media actions
  const reset = useCallback(() => {
    dispatch({ type: MEDIA_ACTIONS.RESET });
  }, [dispatch]);
  
  // Group global actions
  const globalActions = useMemo(
    () => ({
      reset
    }),
    [reset]
  );

  // Combine all actions
  return useMemo(
    () => ({
      ...videoActions,
      ...audioActions,
      ...globalActions,
      videoRef,
    }),
    [videoActions, audioActions, globalActions, videoRef]
  );
}

/**
 * Helper hook to format time in mm:ss format
 */
export function useFormattedTime() {
  return useCallback((time: number): string => {
    if (!time || isNaN(time) || time < 0) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);
}

/**
 * Helper hook to get a blob URL from audio chunks
 */
export function useAudioBlob() {
  const { chunks } = useAudio();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (chunks.length === 0) {
      setAudioUrl(null);
      return;
    }
    
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [chunks]);
  
  return audioUrl;
}
