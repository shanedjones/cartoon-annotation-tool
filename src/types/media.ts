/**
 * Type definitions for media (audio/video) handling
 */
import { Timestamp, VideoPosition, Duration } from './common';
import { RecordedAction } from './timeline';
import { DrawingPath } from '../components/AnnotationCanvas';

/**
 * Represents a chunk of recorded audio
 */
export interface AudioChunk {
  /** Audio data as Blob (in memory) or string (serialized) or null when only blobUrl is used */
  blob: Blob | string | null;
  /** Start time relative to recording start */
  startTime: Timestamp;
  /** Length of audio chunk in ms */
  duration: Duration;
  /** Video position when this audio was recorded */
  videoTime: VideoPosition;
  /** MIME type for proper playback */
  mimeType?: string;
  /** URL for the Azure Storage blob or other remote storage */
  blobUrl?: string;
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
  replayAnnotations?: DrawingPath[]; // Array of annotations to display during replay
  /** Callback when a new annotation is added */
  onAnnotationAdded?: (annotation: DrawingPath) => void;
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
  annotationCanvas: {
    handleManualAnnotation: (path: DrawingPath) => void;
    clearCanvasDrawings: () => void;
  } | null;
  /** Method to add an annotation programmatically */
  handleManualAnnotation: (path: DrawingPath) => void;
  /** Method to clear all annotations */
  clearAllAnnotations: () => void;
}