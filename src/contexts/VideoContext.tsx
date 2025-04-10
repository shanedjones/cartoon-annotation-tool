'use client';

import { createContext, useContext, useReducer, useMemo, useCallback, ReactNode, useRef, MutableRefObject, useEffect, useState } from 'react';
import { VideoState, Dimensions } from '../types';
import { cacheVideo, getFromCache, clearVideoCache, getVideoCacheStats } from '../utils/videoCache';

/**
 * Video Context State Interface
 */
interface VideoContextState {
  // Video playback state
  playback: VideoState;
  // Original Video URL
  videoUrl: string;
  // Cached Blob URL (if available)
  cachedUrl: string | null;
  // Loading state
  isLoading: boolean;
  // Error state for cache failures
  hasError: boolean;
  // Error message for cache failures
  errorMessage: string;
  // Reference to the video element
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  // Whether the video is ready to play
  isReady: boolean;
  // Cache statistics
  cacheStats: {
    count: number;
    totalSize: number;
  };
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
  | { type: 'SET_CACHED_URL'; payload: { url: string | null } }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_ERROR'; payload: { hasError: boolean; errorMessage: string } }
  | { type: 'SET_READY'; payload: { ready: boolean } }
  | { type: 'SET_CACHE_STATS'; payload: { stats: { count: number; totalSize: number } } }
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
  setError: (hasError: boolean, errorMessage: string) => void;
  setReady: (ready: boolean) => void;
  resetCache: () => Promise<void>;
  reset: () => void;
  // Helper methods
  getFormattedTime: (time: number) => string;
  togglePlay: () => void;
  getFormattedCacheSize: () => string;
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

// Format file size helper (bytes to KB, MB, GB)
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
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
  cachedUrl: null,
  isLoading: false,
  hasError: false,
  errorMessage: '',
  videoRef: { current: null },
  isReady: false,
  cacheStats: {
    count: 0,
    totalSize: 0,
  },
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
        // Reset cached URL when setting a new video URL
        cachedUrl: null,
        isReady: false,
        // Reset error state when changing the URL
        hasError: false,
        errorMessage: '',
      };
      
    case 'SET_CACHED_URL':
      return {
        ...state,
        cachedUrl: action.payload.url,
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        hasError: action.payload.hasError,
        errorMessage: action.payload.errorMessage,
      };

    case 'SET_READY':
      return {
        ...state,
        isReady: action.payload.ready,
      };
      
    case 'SET_CACHE_STATS':
      return {
        ...state,
        cacheStats: action.payload.stats,
      };

    case 'RESET':
      return {
        ...initialState,
        videoRef: state.videoRef, // Keep the reference
        cacheStats: state.cacheStats, // Keep cache stats
        hasError: false,
        errorMessage: '',
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

  // We'll use this ref to track if we're currently loading a specific URL
  const loadingUrlRef = useRef<string | null>(null);
  
  // Attempt to load the video from cache when the URL changes
  useEffect(() => {
    // Ignore empty URLs or server-side rendering
    if (!state.videoUrl || typeof window === 'undefined') return;
    
    // If we're already loading this specific URL, don't start another load
    if (loadingUrlRef.current === state.videoUrl) {
      console.log('Already loading this URL, skipping duplicate request:', state.videoUrl);
      return;
    }
    
    // If we're already loading and it's a different URL, cancel the old load and start a new one
    if (state.isLoading) {
      console.log('Switching to load new URL:', state.videoUrl);
    }
    
    // Start loading this URL
    const loadVideoFromCacheOrNetwork = async () => {
      try {
        // Mark we're loading this specific URL
        loadingUrlRef.current = state.videoUrl;
        dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
        console.log('Starting to load video:', state.videoUrl);
        
        // Check if this is a local file URL or blob URL (which we shouldn't try to cache)
        const isLocalOrBlobUrl = 
          state.videoUrl.startsWith('blob:') || 
          state.videoUrl.startsWith('data:') ||
          state.videoUrl.startsWith('file:');
          
        if (isLocalOrBlobUrl) {
          console.log('Using local URL directly, skipping cache:', state.videoUrl);
          dispatch({ type: 'SET_CACHED_URL', payload: { url: state.videoUrl } });
          dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
          return;
        }
        
        // First try to get from cache
        const cachedVideo = await getFromCache(state.videoUrl);
        
        // Make sure we're still loading the same URL (user might have changed it while we were loading)
        if (loadingUrlRef.current !== state.videoUrl) {
          console.log('URL changed during cache lookup, aborting load of:', state.videoUrl);
          return;
        }
        
        if (cachedVideo) {
          console.log('Found video in cache:', state.videoUrl);
          dispatch({ type: 'SET_CACHED_URL', payload: { url: cachedVideo.blobUrl } });
          dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
          return;
        }
        
        // Check if it's a cross-origin URL
        let isCrossOrigin = false;
        try {
          if (typeof window !== 'undefined') {
            const videoUrlObj = new URL(state.videoUrl, window.location.href);
            isCrossOrigin = videoUrlObj.origin !== window.location.origin;
          }
        } catch (e) {
          console.warn('Error parsing URL, assuming same-origin:', e);
        }
        
        if (isCrossOrigin) {
          console.log('Cross-origin video, may have CORS issues:', state.videoUrl);
        }
        
        // Not in cache, need to download and cache
        console.log('Video not in cache, downloading:', state.videoUrl);
        const blobUrl = await cacheVideo(state.videoUrl);
        
        // Make sure we're still loading the same URL
        if (loadingUrlRef.current !== state.videoUrl) {
          console.log('URL changed during fetch, aborting load of:', state.videoUrl);
          return;
        }
        
        // Update cached URL
        dispatch({ type: 'SET_CACHED_URL', payload: { url: blobUrl } });
        
        // Update cache stats after caching
        const stats = await getVideoCacheStats();
        dispatch({ type: 'SET_CACHE_STATS', payload: { stats } });
      } catch (error) {
        console.error('Error loading video:', error);
        
        // Check if URL is still the same before setting error
        if (loadingUrlRef.current === state.videoUrl) {
          // Set error state
          const message = error instanceof Error 
            ? error.message 
            : 'Failed to load video. Please contact technical support.';
          
          // Don't set a fallback URL, instead set an error state
          dispatch({ 
            type: 'SET_ERROR', 
            payload: { 
              hasError: true, 
              errorMessage: message
            } 
          });
        }
      } finally {
        // Only clear loading state if we're still loading the same URL
        if (loadingUrlRef.current === state.videoUrl) {
          loadingUrlRef.current = null;
          
          // We don't automatically set isLoading to false here anymore
          // Instead, the VideoPlayer component will handle this when the
          // video element fires the 'canplaythrough' event, ensuring the
          // loading state accurately reflects when the video is actually
          // ready to play without buffering
        }
      }
    };
    
    loadVideoFromCacheOrNetwork();
  }, [state.videoUrl]);
  
  // Update cache stats periodically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateStats = async () => {
      const stats = await getVideoCacheStats();
      dispatch({ type: 'SET_CACHE_STATS', payload: { stats } });
    };
    
    // Update stats when component mounts
    updateStats();
    
    // Update stats every 5 minutes
    const interval = setInterval(updateStats, 5 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

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
    
    setVideoUrl: (url: string) => {
      // Skip if URL hasn't changed to prevent infinite updates
      if (url === state.videoUrl) return;
      
      // Dispatch URL change - this should also reset error states
      // as defined in the reducer for 'SET_VIDEO_URL'
      dispatch({ type: 'SET_VIDEO_URL', payload: { url } });
    },
    
    setError: (hasError: boolean, errorMessage: string) => 
      dispatch({ type: 'SET_ERROR', payload: { hasError, errorMessage } }),
    
    setReady: (ready: boolean) => 
      dispatch({ type: 'SET_READY', payload: { ready } }),
    
    resetCache: async () => {
      try {
        await clearVideoCache();
        const stats = await getVideoCacheStats();
        dispatch({ type: 'SET_CACHE_STATS', payload: { stats } });
      } catch (error) {
        console.error('Error clearing video cache:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { 
            hasError: true, 
            errorMessage: 'Failed to clear video cache. Please contact technical support.' 
          } 
        });
      }
    },
    
    reset: () => dispatch({ type: 'RESET' }),
  }), [state.videoRef, state.videoUrl]);

  // Helper to format time (mm:ss)
  const getFormattedTime = useCallback((time: number) => formatTime(time), []);
  
  // Helper to format cache size
  const getFormattedCacheSize = useCallback(() => {
    return formatFileSize(state.cacheStats.totalSize);
  }, [state.cacheStats.totalSize]);

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
    getFormattedCacheSize,
    togglePlay,
  }), [state, actions, getFormattedTime, getFormattedCacheSize, togglePlay]);

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

/**
 * Custom hook to get video source URL (either cached or original)
 */
export function useVideoSource() {
  const { state } = useVideo();
  return {
    videoUrl: state.videoUrl,
    cachedUrl: state.cachedUrl,
    isLoading: state.isLoading,
    hasError: state.hasError,
    errorMessage: state.errorMessage,
    effectiveUrl: state.cachedUrl,
    cacheStats: state.cacheStats,
  };
}