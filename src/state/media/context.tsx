'use client';

import React, { createContext, useReducer, ReactNode, useMemo, useEffect, useRef } from 'react';
import { MediaState } from '../types';
import { mediaReducer, initialMediaState, MediaAction, MEDIA_ACTIONS } from './reducer';
import { withDevTools } from '../utils';

// Context type includes both state and dispatch
type MediaContextType = {
  state: MediaState;
  dispatch: React.Dispatch<MediaAction>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

// Create the context
export const MediaContext = createContext<MediaContextType | null>(null);

// Provider props
interface MediaProviderProps {
  children: ReactNode;
  initialState?: Partial<MediaState>;
  initialVideoUrl?: string;
}

/**
 * Media Provider component
 */
export function MediaProvider({ children, initialState, initialVideoUrl }: MediaProviderProps) {
  // Create ref for video element
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Initialize reducer with merged initial state and DevTools support
  const [state, dispatch] = useReducer(
    withDevTools(mediaReducer, 'media'),
    { ...initialMediaState, ...initialState }
  );

  // Set initial video URL if provided
  useEffect(() => {
    if (initialVideoUrl) {
      dispatch({ 
        type: MEDIA_ACTIONS.VIDEO_SET_URL, 
        payload: { url: initialVideoUrl } 
      });
    }
  }, [initialVideoUrl]);

  // Sync video element with reducer state
  useEffect(() => {
    if (!videoRef.current) return;
    
    const videoEl = videoRef.current;
    
    // Create event listeners
    const onPlay = () => dispatch({ type: MEDIA_ACTIONS.VIDEO_PLAY });
    const onPause = () => dispatch({ type: MEDIA_ACTIONS.VIDEO_PAUSE });
    const onTimeUpdate = () => dispatch({ 
      type: MEDIA_ACTIONS.VIDEO_UPDATE_TIME, 
      payload: { time: videoEl.currentTime } 
    });
    const onDurationChange = () => dispatch({ 
      type: MEDIA_ACTIONS.VIDEO_UPDATE_DURATION, 
      payload: { duration: videoEl.duration } 
    });
    const onLoadedMetadata = () => {
      dispatch({ 
        type: MEDIA_ACTIONS.VIDEO_SET_DIMENSIONS, 
        payload: { 
          width: videoEl.videoWidth, 
          height: videoEl.videoHeight 
        } 
      });
      dispatch({ 
        type: MEDIA_ACTIONS.VIDEO_SET_STATUS,
        payload: { status: 'ready' }
      });
    };
    const onError = () => dispatch({
      type: MEDIA_ACTIONS.VIDEO_SET_ERROR,
      payload: { error: 'Error loading video' }
    });
    
    // Add event listeners
    videoEl.addEventListener('play', onPlay);
    videoEl.addEventListener('pause', onPause);
    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('durationchange', onDurationChange);
    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
    videoEl.addEventListener('error', onError);
    
    // Sync state to video element
    if (state.video.isPlaying && videoEl.paused) {
      videoEl.play().catch(() => {});
    } else if (!state.video.isPlaying && !videoEl.paused) {
      videoEl.pause();
    }
    
    videoEl.volume = state.video.volume;
    videoEl.muted = state.video.isMuted;
    videoEl.playbackRate = state.video.playbackRate;
    
    // Clean up event listeners
    return () => {
      videoEl.removeEventListener('play', onPlay);
      videoEl.removeEventListener('pause', onPause);
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('durationchange', onDurationChange);
      videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      videoEl.removeEventListener('error', onError);
    };
  }, [state.video.isPlaying, state.video.volume, state.video.isMuted, state.video.playbackRate]);

  // Sync with global window object for backward compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.__videoPlayerWrapper) {
        window.__videoPlayerWrapper = {
          recordCategoryChange: (category: string, rating: number) => {
            // Default implementation that does nothing
            console.log(`Default recordCategoryChange: ${category} = ${rating}`);
          },
          isRecording: false
        };
      }
      
      // Now it's safe to add the setPlaying method
      (window.__videoPlayerWrapper as any).setPlaying = (playing: boolean) => {
        dispatch({ 
          type: playing ? MEDIA_ACTIONS.VIDEO_PLAY : MEDIA_ACTIONS.VIDEO_PAUSE
        });
      };
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ 
    state, 
    dispatch,
    videoRef 
  }), [state]);

  return (
    <MediaContext.Provider value={contextValue}>
      {children}
    </MediaContext.Provider>
  );
}
