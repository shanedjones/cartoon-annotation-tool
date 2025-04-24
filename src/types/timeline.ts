/**
 * Type definitions for timeline and event recording/playback
 */
import { EntityId, TimelinePosition, VideoPosition, Timestamp, Duration, Dictionary } from './common';
import { DrawingPath } from './annotation';
import { AudioTrack, AudioChunk } from './media';

/**
 * Types of actions that can be recorded
 */
export type ActionType = 'play' | 'pause' | 'seek' | 'playbackRate' | 'keyboardShortcut' | 'annotation' | 'audio';

/**
 * Types of timeline events
 */
export type TimelineEventType = 'video' | 'annotation' | 'marker' | 'category';

/**
 * Base interface for all payload types
 */
export interface BasePayload {
  [key: string]: unknown;
}

/**
 * Video action payload
 */
export interface VideoPayload extends BasePayload {
  action: string;
  from?: number;
  to?: number;
  globalTimeOffset?: TimelinePosition;
}

/**
 * Annotation action payload
 */
export interface AnnotationPayload extends BasePayload {
  action: 'draw' | 'clear';
  path?: DrawingPath;
  clear?: boolean;
  globalTimeOffset?: TimelinePosition;
}

/**
 * Marker action payload
 */
export interface MarkerPayload extends BasePayload {
  text: string;
}

/**
 * Category action payload
 */
export interface CategoryPayload extends BasePayload {
  category: string;
  rating: number;
}

/**
 * Discriminated union of all possible payload types
 */
export type TimelinePayload = 
  | { type: 'video'; payload: VideoPayload }
  | { type: 'annotation'; payload: AnnotationPayload }
  | { type: 'marker'; payload: MarkerPayload }
  | { type: 'category'; payload: CategoryPayload };

/**
 * Timeline event - represents an action on the global timeline
 */
export interface TimelineEvent {
  /** Unique identifier for the event */
  id: EntityId;
  /** Type of the event */
  type: TimelineEventType;
  /** Time offset in milliseconds from the start of recording */
  timeOffset: TimelinePosition;
  /** Duration in milliseconds (for events with duration) */
  duration?: Duration;
  /** Event-specific data */
  payload: TimelinePayload['payload']; // Using the discriminated union
}

/**
 * Recorded action from the video player
 */
export interface RecordedAction {
  /** Type of action */
  type: ActionType;
  /** Time in milliseconds since recording started */
  timestamp: TimelinePosition;
  /** Current time in the video when action occurred */
  videoTime: VideoPosition;
  /** Additional details specific to the action */
  details?: {
    [key: string]: unknown;
  };
}

/**
 * Legacy feedback data structure
 */
export interface FeedbackData {
  /** Unique session identifier */
  sessionId: EntityId;
  /** Identifier for the video */
  videoId: EntityId;
  /** Array of recorded actions */
  actions: RecordedAction[];
  /** Timestamp when recording started */
  startTime: Timestamp;
  /** Timestamp when recording ended */
  endTime?: Timestamp;
  /** Annotations created during the session */
  annotations?: DrawingPath[];
  /** Audio recordings created during the session */
  audioChunks?: AudioChunk[];
}

/**
 * Modern feedback session structure
 */
export interface FeedbackSession {
  /** Unique session identifier */
  id: EntityId;
  /** Identifier for the video */
  videoId: EntityId;
  /** Timestamp when recording started */
  startTime: Timestamp;
  /** Timestamp when recording ended */
  endTime?: Timestamp;
  /** Audio track containing all audio data */
  audioTrack: AudioTrack;
  /** Timeline events */
  events: TimelineEvent[];
  /** Category ratings */
  categories?: Dictionary<number | boolean>;
}

/**
 * Properties for the feedback orchestrator
 */
export interface FeedbackOrchestratorProps {
  /** Reference to the video element */
  videoElementRef: React.RefObject<HTMLVideoElement>;
  /** Reference to the canvas element */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Method to draw an annotation */
  drawAnnotation: (path: DrawingPath) => void;
  /** Method to clear annotations */
  clearAnnotations: () => void;
  /** Callback when audio is recorded */
  onAudioRecorded: (audioTrack: AudioTrack) => void;
  /** Callback when a session is completed */
  onSessionComplete: (session: FeedbackSession) => void;
  /** Initial session for replay */
  initialSession?: FeedbackSession | null;
  /** Current operation mode */
  mode: 'record' | 'replay';
  /** Callback when categories are loaded during replay */
  onCategoriesLoaded?: (categories: Dictionary<number | boolean>) => void;
}