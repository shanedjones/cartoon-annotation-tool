import { MediaState, VideoState, AudioState } from '../types';
import { Action, createReducer } from '../utils';

// Action Types
export const MEDIA_ACTIONS = {
  // Video actions
  VIDEO_PLAY: 'media/video/play',
  VIDEO_PAUSE: 'media/video/pause',
  VIDEO_SEEK: 'media/video/seek',
  VIDEO_UPDATE_TIME: 'media/video/updateTime',
  VIDEO_UPDATE_DURATION: 'media/video/updateDuration',
  VIDEO_SET_PLAYBACK_RATE: 'media/video/setPlaybackRate',
  VIDEO_SET_DIMENSIONS: 'media/video/setDimensions',
  VIDEO_SET_MUTED: 'media/video/setMuted',
  VIDEO_SET_VOLUME: 'media/video/setVolume',
  VIDEO_SET_URL: 'media/video/setUrl',
  VIDEO_SET_STATUS: 'media/video/setStatus',
  VIDEO_SET_ERROR: 'media/video/setError',
  
  // Audio actions
  AUDIO_START_RECORDING: 'media/audio/startRecording',
  AUDIO_STOP_RECORDING: 'media/audio/stopRecording',
  AUDIO_ADD_CHUNK: 'media/audio/addChunk',
  AUDIO_CLEAR_CHUNKS: 'media/audio/clearChunks',
  AUDIO_SET_DURATION: 'media/audio/setDuration',
  AUDIO_SET_STATUS: 'media/audio/setStatus',
  AUDIO_SET_ERROR: 'media/audio/setError',
  
  // Global media actions
  RESET: 'media/reset'
} as const;

// Action Creators
export type MediaAction = 
  // Video actions
  | Action<typeof MEDIA_ACTIONS.VIDEO_PLAY>
  | Action<typeof MEDIA_ACTIONS.VIDEO_PAUSE>
  | Action<typeof MEDIA_ACTIONS.VIDEO_SEEK, { time: number }>
  | Action<typeof MEDIA_ACTIONS.VIDEO_UPDATE_TIME, { time: number }>
  | Action<typeof MEDIA_ACTIONS.VIDEO_UPDATE_DURATION, { duration: number }>
  | Action<typeof MEDIA_ACTIONS.VIDEO_SET_PLAYBACK_RATE, { rate: number }>
  | Action<typeof MEDIA_ACTIONS.VIDEO_SET_DIMENSIONS, { width: number, height: number }>
  | Action<typeof MEDIA_ACTIONS.VIDEO_SET_MUTED, { muted: boolean }>
  | Action<typeof MEDIA_ACTIONS.VIDEO_SET_VOLUME, { volume: number }>
  | Action<typeof MEDIA_ACTIONS.VIDEO_SET_URL, { url: string | null }>
  | Action<typeof MEDIA_ACTIONS.VIDEO_SET_STATUS, { status: VideoState['status'] }>
  | Action<typeof MEDIA_ACTIONS.VIDEO_SET_ERROR, { error: string }>
  
  // Audio actions
  | Action<typeof MEDIA_ACTIONS.AUDIO_START_RECORDING>
  | Action<typeof MEDIA_ACTIONS.AUDIO_STOP_RECORDING>
  | Action<typeof MEDIA_ACTIONS.AUDIO_ADD_CHUNK, { chunk: Blob }>
  | Action<typeof MEDIA_ACTIONS.AUDIO_CLEAR_CHUNKS>
  | Action<typeof MEDIA_ACTIONS.AUDIO_SET_DURATION, { duration: number }>
  | Action<typeof MEDIA_ACTIONS.AUDIO_SET_STATUS, { status: AudioState['status'] }>
  | Action<typeof MEDIA_ACTIONS.AUDIO_SET_ERROR, { error: string }>
  
  // Global actions
  | Action<typeof MEDIA_ACTIONS.RESET>;

// Initial Video State
const initialVideoState: VideoState = {
  isPlaying: false,
  isMuted: false,
  volume: 1,
  playbackRate: 1,
  currentSrc: null,
  duration: 0,
  buffered: null,
  dimensions: {
    width: 0,
    height: 0,
  },
  status: 'idle',
};

// Initial Audio State
const initialAudioState: AudioState = {
  isRecording: false,
  chunks: [],
  duration: 0,
  status: 'idle',
};

// Initial Media State (combines video and audio)
export const initialMediaState: MediaState = {
  video: initialVideoState,
  audio: initialAudioState,
};

// Video reducer handlers
const videoReducerHandlers = {
  [MEDIA_ACTIONS.VIDEO_PLAY]: (state: MediaState) => ({
    ...state,
    video: {
      ...state.video,
      isPlaying: true,
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_PAUSE]: (state: MediaState) => ({
    ...state,
    video: {
      ...state.video,
      isPlaying: false,
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_SEEK]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      currentTime: (action as any).payload?.time || 0,
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_UPDATE_TIME]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      currentTime: (action as any).payload?.time || 0,
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_UPDATE_DURATION]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      duration: (action as any).payload?.duration || 0,
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_SET_PLAYBACK_RATE]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      playbackRate: (action as any).payload?.rate || 1,
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_SET_DIMENSIONS]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      dimensions: {
        width: (action as any).payload?.width || 0,
        height: (action as any).payload?.height || 0,
      },
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_SET_MUTED]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      isMuted: (action as any).payload?.muted || false,
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_SET_VOLUME]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      volume: (action as any).payload?.volume || 1,
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_SET_URL]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      currentSrc: (action as any).payload?.url || null,
      status: 'loading' as 'idle' | 'loading' | 'ready' | 'error',
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_SET_STATUS]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      status: ((action as any).payload?.status || 'idle') as 'idle' | 'loading' | 'ready' | 'error',
    },
  }),
  
  [MEDIA_ACTIONS.VIDEO_SET_ERROR]: (state: MediaState, action: MediaAction) => ({
    ...state,
    video: {
      ...state.video,
      status: 'error' as 'idle' | 'loading' | 'ready' | 'error',
      error: (action as any).payload?.error,
    },
  }),
};

// Audio reducer handlers
const audioReducerHandlers = {
  [MEDIA_ACTIONS.AUDIO_START_RECORDING]: (state: MediaState) => ({
    ...state,
    audio: {
      ...state.audio,
      isRecording: true,
      status: 'recording' as 'idle' | 'recording' | 'processing' | 'ready' | 'error',
      chunks: [],
    },
  }),
  
  [MEDIA_ACTIONS.AUDIO_STOP_RECORDING]: (state: MediaState) => ({
    ...state,
    audio: {
      ...state.audio,
      isRecording: false,
      status: 'processing' as 'idle' | 'recording' | 'processing' | 'ready' | 'error',
    },
  }),
  
  [MEDIA_ACTIONS.AUDIO_ADD_CHUNK]: (state: MediaState, action: MediaAction) => ({
    ...state,
    audio: {
      ...state.audio,
      chunks: [...state.audio.chunks, (action as any).payload?.chunk],
    },
  }),
  
  [MEDIA_ACTIONS.AUDIO_CLEAR_CHUNKS]: (state: MediaState) => ({
    ...state,
    audio: {
      ...state.audio,
      chunks: [],
    },
  }),
  
  [MEDIA_ACTIONS.AUDIO_SET_DURATION]: (state: MediaState, action: MediaAction) => ({
    ...state,
    audio: {
      ...state.audio,
      duration: (action as any).payload?.duration || 0,
    },
  }),
  
  [MEDIA_ACTIONS.AUDIO_SET_STATUS]: (state: MediaState, action: MediaAction) => ({
    ...state,
    audio: {
      ...state.audio,
      status: ((action as any).payload?.status || 'idle') as 'idle' | 'recording' | 'processing' | 'ready' | 'error',
    },
  }),
  
  [MEDIA_ACTIONS.AUDIO_SET_ERROR]: (state: MediaState, action: MediaAction) => ({
    ...state,
    audio: {
      ...state.audio,
      status: 'error' as 'idle' | 'recording' | 'processing' | 'ready' | 'error',
      error: (action as any).payload?.error,
    },
  }),
};

// Global actions
const globalReducerHandlers = {
  [MEDIA_ACTIONS.RESET]: () => initialMediaState,
};

// Combine all handlers
const allHandlers = {
  ...videoReducerHandlers,
  ...audioReducerHandlers,
  ...globalReducerHandlers,
};

// Create the reducer
export const mediaReducer = createReducer<MediaState, MediaAction>(
  initialMediaState,
  allHandlers
);
