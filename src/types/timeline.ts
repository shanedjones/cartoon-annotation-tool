import { EntityId, TimelinePosition, VideoPosition, Timestamp, Duration, Dictionary } from './common';
import { DrawingPath } from './annotation';
import { AudioTrack, AudioChunk } from './media';
export type ActionType = 'play' | 'pause' | 'seek' | 'playbackRate' | 'keyboardShortcut' | 'annotation' | 'audio';
export type TimelineEventType = 'video' | 'annotation' | 'marker' | 'category';
export interface BasePayload {
  [key: string]: any;
}
export interface VideoPayload extends BasePayload {
  action: string;
  from?: number;
  to?: number;
  globalTimeOffset?: TimelinePosition;
}
export interface AnnotationPayload extends BasePayload {
  action: 'draw' | 'clear';
  path?: DrawingPath;
  clear?: boolean;
  globalTimeOffset?: TimelinePosition;
}
export interface MarkerPayload extends BasePayload {
  text: string;
}
export interface CategoryPayload extends BasePayload {
  category: string;
  rating: number;
}
export type TimelinePayload =
  | { type: 'video'; payload: VideoPayload }
  | { type: 'annotation'; payload: AnnotationPayload }
  | { type: 'marker'; payload: MarkerPayload }
  | { type: 'category'; payload: CategoryPayload };
export interface TimelineEvent {
  id: EntityId;
  type: TimelineEventType;
  timeOffset: TimelinePosition;
  duration?: Duration;
  payload: any;
}
export interface RecordedAction {
  type: ActionType;
  timestamp: TimelinePosition;
  videoTime: VideoPosition;
  details?: {
    [key: string]: any;
  };
}
export interface FeedbackData {
  sessionId: EntityId;
  videoId: EntityId;
  actions: RecordedAction[];
  startTime: Timestamp;
  endTime?: Timestamp;
  annotations?: DrawingPath[];
  audioChunks?: AudioChunk[];
}
export interface FeedbackSession {
  id: EntityId;
  videoId: EntityId;
  startTime: Timestamp;
  endTime?: Timestamp;
  audioTrack: AudioTrack;
  events: TimelineEvent[];
  categories?: Dictionary<number | boolean>;
}
export interface FeedbackOrchestratorProps {
  videoElementRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<any>;
  drawAnnotation: (path: DrawingPath) => void;
  clearAnnotations: () => void;
  onAudioRecorded: (audioTrack: AudioTrack) => void;
  onSessionComplete: (session: FeedbackSession) => void;
  initialSession?: FeedbackSession | null;
  mode: 'record' | 'replay';
  onCategoriesLoaded?: (categories: Dictionary<number | boolean>) => void;
}