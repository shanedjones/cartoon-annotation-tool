/**
 * Type definitions for media (audio/video) handling
 */
import { Timestamp, VideoPosition, Duration } from './common';
import { RecordedAction } from './timeline';

/**
 * Represents a chunk of recorded audio
 */
export interface AudioChunk {
  /** Audio data as Blob (in memory) or string (serialized) */
  blob: Blob | string;
  /** Start time relative to recording start */
  startTime: Timestamp;
  /** Length of audio chunk in ms */
  duration: Duration;
  /** Video position when this audio was recorded */
  videoTime: VideoPosition;
  /** URL for playback (created during replay) */
  url?: string;
  /** MIME type for proper playback */
  mimeType?: string;
}

/**
 * Audio track containing all audio recording data
 */
export interface AudioTrack {
  /** Array of audio chunks that make up the recording */
  chunks: AudioChunk[];
  /** Total duration of all audio in ms */
  totalDuration: Duration;
}

/**
 * Properties for the AudioRecorder component
 */
export interface AudioRecorderProps {
  /** Whether recording is active */
  isRecording: boolean;
  /** Whether replay is active */
  isReplaying: boolean;
  /** Current video playback position in seconds */
  currentVideoTime: number;
  /** Callback when an audio chunk is recorded */
  onAudioChunk?: (chunk: AudioChunk) => void;
  /** Audio chunks to replay */
  replayAudioChunks?: AudioChunk[];
}

/**
 * State for video playback
 */
export interface VideoState {
  /** Whether video is currently playing */
  isPlaying: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total video duration in seconds */
  duration: number;
  /** Current playback speed (1.0 = normal) */
  playbackRate: number;
  /** Video dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Whether the video is muted */
  isMuted: boolean;
  /** Current volume level (0-1) */
  volume: number;
}

/**
 * Properties for the VideoPlayer component
 */
export interface VideoPlayerProps {
  /** Whether recording is active */
  isRecording?: boolean;
  /** Whether replay is active */
  isReplaying?: boolean;
  /** Callback for when a recordable action occurs */
  onRecordAction?: (action: RecordedAction) => void;
  /** Callback to set the video element reference */
  setVideoRef?: (ref: HTMLVideoElement | null) => void;
  /** Annotations to display during replay */
  replayAnnotations?: any[]; // Replace with proper type
  /** Callback when a new annotation is added */
  onAnnotationAdded?: (annotation: any) => void; // Replace with proper type
  /** URL of the video to play */
  videoUrl?: string;
}

/**
 * Methods exposed by the VideoPlayer via forwardRef
 */
export interface VideoPlayerRef {
  /** Reference to the video element */
  video: HTMLVideoElement | null;
  /** Reference to the annotation canvas */
  annotationCanvas: any; // Replace with proper type
  /** Method to add an annotation programmatically */
  handleManualAnnotation: (path: any) => void; // Replace with proper type
  /** Method to clear all annotations */
  clearAllAnnotations: () => void;
}