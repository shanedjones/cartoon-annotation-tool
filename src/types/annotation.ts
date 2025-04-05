/**
 * Type definitions for annotations and drawing functionality
 */
import { Point, Color, StrokeWidth, TimelinePosition, VideoPosition, Timestamp, EntityId } from './common';

/**
 * Represents a drawing path for annotations
 */
export interface DrawingPath {
  /** Array of points that make up the drawing path */
  points: Point[];
  /** Color of the drawing stroke */
  color: Color;
  /** Width of the drawing stroke in pixels */
  width: StrokeWidth;
  /** Local timestamp when the annotation was created */
  timestamp: Timestamp;
  /** Time position in the video when this annotation was created (in ms) */
  videoTime?: VideoPosition;
  /** The global timeline position when this annotation was created (in ms) */
  globalTimeOffset?: TimelinePosition;
  /** Explicit timeOffset property added by FeedbackOrchestrator */
  timeOffset?: TimelinePosition;
  /** Optional ID for the drawing path */
  id?: EntityId;
}

/**
 * Properties required for the AnnotationCanvas component
 */
export interface AnnotationCanvasProps {
  /** Width of the canvas in pixels */
  width: number;
  /** Height of the canvas in pixels */
  height: number;
  /** Whether drawing is enabled */
  isEnabled: boolean;
  /** Current playback position of the video in seconds */
  currentTime: number;
  /** Whether recording is active */
  isRecording?: boolean;
  /** Whether replay is active */
  isReplaying?: boolean;
  /** Callback for when a new annotation is drawn */
  onAnnotationAdded?: (path: DrawingPath) => void;
  /** Annotations to display during replay */
  replayAnnotations?: DrawingPath[];
  /** Current drawing tool color */
  toolColor?: Color;
  /** Current drawing tool width */
  toolWidth?: StrokeWidth;
  /** Flag to clear the canvas */
  clearCanvas?: boolean;
  /** Callback when canvas clearing is complete */
  onClearComplete?: () => void;
}

/**
 * Represents the state of the annotation tool
 */
export interface AnnotationState {
  /** Whether drawing mode is active */
  isDrawingEnabled: boolean;
  /** Currently selected color */
  currentColor: Color;
  /** Currently selected stroke width */
  currentWidth: StrokeWidth;
  /** All drawing paths created in the current session */
  paths: DrawingPath[];
  /** Time of last canvas clear operation in global timeline */
  lastClearTime: TimelinePosition;
}

/**
 * Methods exposed by the AnnotationCanvas via forwardRef
 */
export interface AnnotationCanvasRef {
  /** Reference to the canvas element */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** All drawing paths */
  allDrawings: DrawingPath[];
  /** Get the canvas context */
  getContext: () => CanvasRenderingContext2D | null;
  /** Clear all drawings from the canvas */
  clearCanvasDrawings: () => void;
  /** Programmatically add an annotation */
  handleManualAnnotation: (path: DrawingPath) => void;
}