import { Timestamp, VideoPosition, EntityId, TimelinePosition, Duration } from './common';
import { RecordedAction } from './timeline';
export interface AudioChunk {
  blob: Blob | string;
  startTime: Timestamp;
  duration: Duration;
  videoTime: VideoPosition;
  url?: string;
  mimeType?: string;
}
export interface AudioTrack {
  chunks: AudioChunk[];
  totalDuration: Duration;
}
export interface AudioRecorderProps {
  isRecording: boolean;
  isReplaying: boolean;
  currentVideoTime: number;
  onAudioChunk?: (chunk: AudioChunk) => void;
  replayAudioChunks?: AudioChunk[];
}
export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  dimensions: {
    width: number;
    height: number;
  };
  isMuted: boolean;
  volume: number;
}
export interface VideoPlayerProps {
  isRecording?: boolean;
  isReplaying?: boolean;
  onRecordAction?: (action: RecordedAction) => void;
  setVideoRef?: (ref: HTMLVideoElement | null) => void;
  replayAnnotations?: any[];
  onAnnotationAdded?: (annotation: any) => void;
  videoUrl?: string;
}
export interface VideoPlayerRef {
  video: HTMLVideoElement | null;
  annotationCanvas: any;
  handleManualAnnotation: (path: any) => void;
  clearAllAnnotations: () => void;
}