'use client';
import { createContext, useContext, useReducer, useMemo, useCallback, ReactNode, useRef, MutableRefObject, useEffect, useState } from 'react';
import { VideoState, Dimensions } from '../types';
import { cacheVideo, getFromCache, clearVideoCache, getVideoCacheStats } from '../utils/videoCache';
interface VideoContextState {
  playback: VideoState;
  videoUrl: string;
  cachedUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  isReady: boolean;
  cacheStats: {
    count: number;
    totalSize: number;
  };
}
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
interface VideoContextType {
  state: VideoContextState;
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
  getFormattedTime: (time: number) => string;
  togglePlay: () => void;
  getFormattedCacheSize: () => string;
}
function formatTime(time: number): string {
  if (!time || isNaN(time) || time < 0) {
    return '0:00';
  }
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}
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
        cachedUrl: null,
        isReady: false,
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
        videoRef: state.videoRef,
        cacheStats: state.cacheStats,
        hasError: false,
        errorMessage: '',
      };
    default:
      return state;
  }
}
const VideoContext = createContext<VideoContextType | null>(null);
interface VideoProviderProps {
  children: ReactNode;
  initialUrl?: string;
}
export function VideoProvider({ children, initialUrl = '' }: VideoProviderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const initialContextState = {
    ...initialState,
    videoUrl: initialUrl,
    videoRef,
  };
  const [state, dispatch] = useReducer(videoReducer, initialContextState);
  const loadingUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.videoUrl || typeof window === 'undefined') return;
    if (loadingUrlRef.current === state.videoUrl) {
      return;
    }
    if (state.isLoading) {
    }
    const loadVideoFromCacheOrNetwork = async () => {
      try {
        loadingUrlRef.current = state.videoUrl;
        dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
        const isLocalOrBlobUrl =
          state.videoUrl.startsWith('blob:') ||
          state.videoUrl.startsWith('data:') ||
          state.videoUrl.startsWith('file:');
        if (isLocalOrBlobUrl) {
          dispatch({ type: 'SET_CACHED_URL', payload: { url: state.videoUrl } });
          dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
          return;
        }
        const cachedVideo = await getFromCache(state.videoUrl);
        if (loadingUrlRef.current !== state.videoUrl) {
          return;
        }
        if (cachedVideo) {
          dispatch({ type: 'SET_CACHED_URL', payload: { url: cachedVideo.blobUrl } });
          dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
          return;
        }
        let isCrossOrigin = false;
        try {
          if (typeof window !== 'undefined') {
            const videoUrlObj = new URL(state.videoUrl, window.location.href);
            isCrossOrigin = videoUrlObj.origin !== window.location.origin;
          }
        } catch (e) {
        }
        if (isCrossOrigin) {
        }
        const blobUrl = await cacheVideo(state.videoUrl);
        if (loadingUrlRef.current !== state.videoUrl) {
          return;
        }
        dispatch({ type: 'SET_CACHED_URL', payload: { url: blobUrl } });
        const stats = await getVideoCacheStats();
        dispatch({ type: 'SET_CACHE_STATS', payload: { stats } });
      } catch (error) {
        if (loadingUrlRef.current === state.videoUrl) {
          const message = error instanceof Error
            ? error.message
            : 'Failed to load video. Please contact technical support.';
          dispatch({
            type: 'SET_ERROR',
            payload: {
              hasError: true,
              errorMessage: message
            }
          });
        }
      } finally {
        if (loadingUrlRef.current === state.videoUrl) {
          loadingUrlRef.current = null;
        }
      }
    };
    loadVideoFromCacheOrNetwork();
  }, [state.videoUrl]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateStats = async () => {
      const stats = await getVideoCacheStats();
      dispatch({ type: 'SET_CACHE_STATS', payload: { stats } });
    };
    updateStats();
    const interval = setInterval(updateStats, 5 * 60 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);
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
      if (url === state.videoUrl) return;
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
  const getFormattedTime = useCallback((time: number) => formatTime(time), []);
  const getFormattedCacheSize = useCallback(() => {
    return formatFileSize(state.cacheStats.totalSize);
  }, [state.cacheStats.totalSize]);
  const togglePlay = useCallback(() => {
    if (state.playback.isPlaying) {
      actions.pause();
    } else {
      actions.play();
    }
  }, [state.playback.isPlaying, actions]);
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
export function useVideo() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}
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
export function useVideoDimensions() {
  const { state, setDimensions } = useVideo();
  return {
    dimensions: state.playback.dimensions,
    setDimensions,
  };
}
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