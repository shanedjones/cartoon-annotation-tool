'use client';

import { createContext, useContext, useReducer, useMemo, useCallback, ReactNode, useRef, MutableRefObject } from 'react';
import { VideoState, Dimensions } from '../types';

/**
 * Video Context State Interface
 */
interface VideoContextState {
  // Video playback state
  playback: VideoState;
  // Video URL
  videoUrl: string;
  // Reference to the video element
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  // Whether the video is ready to play
  isReady: boolean;
}

/**
 * Video Action Types
 */
type VideoActionType = 
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK'; payload: { time: number } }
  | { type: 'UPDATE_TIME'; payload: { time: number } }
  | { type: 'UPDATE_DURATION'; payload: { duration: number } }
  | { type: 'SET_PLAYBACK_RATE'; payload: { rate: number } }
  | { type: 'SET_DIMENSIONS'; payload: { dimensions: Dimensions } }
  | { type: 'SET_MUTED'; payload: { muted: boolean } }
  | { type: 'SET_VOLUME'; payload: { volume: number } }
  | { type: 'SET_VIDEO_URL'; payload: { url: string } }
  | { type: 'SET_READY'; payload: { ready: boolean } }
  | { type: 'RESET' };

/**
 * Video Context Interface
 */
interface VideoContextType {
  // Current state
  state: VideoContextState;
  // Action dispatchers
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  updateTime: (time: number) => void;
  updateDuration: (duration: number) => void;
  setPlaybackRate: (rate: number) => void;
  setDimensions: (dimensions: Dimensions) => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setVideoUrl: (url: string) => void;
  setReady: (ready: boolean) => void;
  reset: () => void;
  // Helper methods
  getFormattedTime: (time: number) => string;
  togglePlay: () => void;
}

// Format time helper function (mm:ss)
function formatTime(time: number): string {
  if (!time || isNaN(time) || time < 0) {
    return '0:00';
  }
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Initial video state
const initialVideoState: VideoState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  dimensions: {
    width: 0,
    height: 0,
  },
  isMuted: false,
  volume: 1,
};

// Initial context state
const initialState: VideoContextState = {
  playback: initialVideoState,
  videoUrl: '',
  videoRef: { current: null },
  isReady: false,
};

// Video reducer
function videoReducer(state: VideoContextState, action: VideoActionType): VideoContextState {
  switch (action.type) {
    case 'PLAY':
      return {
        ...state,
        playback: {
          ...state.playback,
          isPlaying: true,
        },
      };

    case 'PAUSE':
      return {
        ...state,
        playback: {
          ...state.playback,
          isPlaying: false,
        },
      };

    case 'SEEK':
      return {
        ...state,
        playback: {
          ...state.playback,
          currentTime: action.payload.time,
        },
      };

    case 'UPDATE_TIME':
      return {
        ...state,
        playback: {
          ...state.playback,
          currentTime: action.payload.time,
        },
      };

    case 'UPDATE_DURATION':
      return {
        ...state,
        playback: {
          ...state.playback,
          duration: action.payload.duration,
        },
      };

    case 'SET_PLAYBACK_RATE':
      return {
        ...state,
        playback: {
          ...state.playback,
          playbackRate: action.payload.rate,
        },
      };

    case 'SET_DIMENSIONS':
      return {
        ...state,
        playback: {
          ...state.playback,
          dimensions: action.payload.dimensions,
        },
      };

    case 'SET_MUTED':
      return {
        ...state,
        playback: {
          ...state.playback,
          isMuted: action.payload.muted,
        },
      };

    case 'SET_VOLUME':
      return {
        ...state,
        playback: {
          ...state.playback,
          volume: action.payload.volume,
        },
      };

    case 'SET_VIDEO_URL':
      return {
        ...state,
        videoUrl: action.payload.url,
      };

    case 'SET_READY':
      return {
        ...state,
        isReady: action.payload.ready,
      };

    case 'RESET':
      return {
        ...initialState,
        videoRef: state.videoRef, // Keep the reference
      };

    default:
      return state;
  }
}

// Create the context
const VideoContext = createContext<VideoContextType | null>(null);

/**
 * Video Provider Props
 */
interface VideoProviderProps {
  children: ReactNode;
  initialUrl?: string;
}

/**
 * Video Provider Component
 */
export function VideoProvider({ children, initialUrl = '' }: VideoProviderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const initialContextState = {
    ...initialState,
    videoUrl: initialUrl,
    videoRef,
  };
  
  const [state, dispatch] = useReducer(videoReducer, initialContextState);

  // Memoized action creators
  const actions = useMemo(() => ({
    play: () => {
      if (state.videoRef.current) {
        state.videoRef.current.play();
      }
      dispatch({ type: 'PLAY' });
    },
    
    pause: () => {
      if (state.videoRef.current) {
        state.videoRef.current.pause();
      }
      dispatch({ type: 'PAUSE' });
    },
    
    seek: (time: number) => {
      if (state.videoRef.current) {
        state.videoRef.current.currentTime = time;
      }
      dispatch({ type: 'SEEK', payload: { time } });
    },
    
    updateTime: (time: number) => 
      dispatch({ type: 'UPDATE_TIME', payload: { time } }),
    
    updateDuration: (duration: number) => 
      dispatch({ type: 'UPDATE_DURATION', payload: { duration } }),
    
    setPlaybackRate: (rate: number) => {
      if (state.videoRef.current) {
        state.videoRef.current.playbackRate = rate;
      }
      dispatch({ type: 'SET_PLAYBACK_RATE', payload: { rate } });
    },
    
    setDimensions: (dimensions: Dimensions) => 
      dispatch({ type: 'SET_DIMENSIONS', payload: { dimensions } }),
    
    setMuted: (muted: boolean) => {
      if (state.videoRef.current) {
        state.videoRef.current.muted = muted;
      }
      dispatch({ type: 'SET_MUTED', payload: { muted } });
    },
    
    setVolume: (volume: number) => {
      if (state.videoRef.current) {
        state.videoRef.current.volume = volume;
      }
      dispatch({ type: 'SET_VOLUME', payload: { volume } });
    },
    
    setVideoUrl: (url: string) => 
      dispatch({ type: 'SET_VIDEO_URL', payload: { url } }),
    
    setReady: (ready: boolean) => 
      dispatch({ type: 'SET_READY', payload: { ready } }),
    
    reset: () => dispatch({ type: 'RESET' }),
  }), [state.videoRef]);

  // Helper to format time (mm:ss)
  const getFormattedTime = useCallback((time: number) => formatTime(time), []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (state.playback.isPlaying) {
      actions.pause();
    } else {
      actions.play();
    }
  }, [state.playback.isPlaying, actions]);

  // Provide the context value
  const contextValue = useMemo(() => ({
    state,
    ...actions,
    getFormattedTime,
    togglePlay,
  }), [state, actions, getFormattedTime, togglePlay]);

  return (
    <VideoContext.Provider value={contextValue}>
      {children}
    </VideoContext.Provider>
  );
}

/**
 * Custom hook to use the video context
 */
export function useVideo() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}

/**
 * Custom hook to get video playback controls
 */
export function useVideoControls() {
  const { state, play, pause, seek, setPlaybackRate, togglePlay } = useVideo();
  return {
    isPlaying: state.playback.isPlaying,
    currentTime: state.playback.currentTime,
    duration: state.playback.duration,
    playbackRate: state.playback.playbackRate,
    play,
    pause,
    seek,
    setPlaybackRate,
    togglePlay,
  };
}

/**
 * Custom hook to get video dimensions
 */
export function useVideoDimensions() {
  const { state, setDimensions } = useVideo();
  return {
    dimensions: state.playback.dimensions,
    setDimensions,
  };
}