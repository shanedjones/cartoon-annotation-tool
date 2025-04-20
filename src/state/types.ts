// Core application state types

// Auth domain types
export interface AuthState {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  error?: string;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
}

// Session domain types
export interface SessionState {
  currentSession: Session | null;
  sessionHistory: Session[];
  isRecording: boolean;
  isReplaying: boolean;
  categories: CategoryRating[];
  status: 'idle' | 'loading' | 'recording' | 'replaying' | 'complete' | 'error';
}

// Define a basic Annotation type
export interface Annotation {
  id: string;
  time: number;
  path?: AnnotationPath;
  type: string;
  data?: any;
}

export interface Session {
  id: string;
  videoId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  categories: CategoryRating[];
  annotations: Annotation[];
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface CategoryRating {
  categoryId: string;
  rating: number;
}

// Media domain types
export interface MediaState {
  video: VideoState;
  audio: AudioState;
}

export interface VideoState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  currentSrc: string | null;
  duration: number;
  buffered: TimeRanges | null;
  dimensions: {
    width: number;
    height: number;
  };
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
}

export interface AudioState {
  isRecording: boolean;
  chunks: Blob[];
  duration: number;
  status: 'idle' | 'recording' | 'processing' | 'ready' | 'error';
  error?: string;
}

// Timeline domain types
export interface TimelineState {
  position: number;
  duration: number;
  events: TimelineEvent[];
  markers: TimelineMarker[];
  isRecording: boolean;
  recordingStartTime: number | null;
}

export interface TimelineEvent {
  id: string;
  time: number;
  type: string;
  data?: any;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label?: string;
  type: 'annotation' | 'comment' | 'custom';
}

// Annotation domain types
export interface AnnotationState {
  paths: AnnotationPath[];
  currentTool: AnnotationTool;
  strokeWidth: number;
  color: string;
  isVisible: boolean;
  temporalVisibility: boolean;
  lastClearTime: number;
}

export interface AnnotationPath {
  id: string;
  points: Point[];
  startTime: number;
  endTime?: number;
  color: string;
  strokeWidth: number;
  tool: AnnotationTool;
  isVisible: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export type AnnotationTool = 'pen' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'eraser';

// Root state type
export interface AppState {
  auth: AuthState;
  session: SessionState;
  media: MediaState;
  timeline: TimelineState;
  annotation: AnnotationState;
}
