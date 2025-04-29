import { Point, Color, StrokeWidth, TimelinePosition, VideoPosition, Timestamp, EntityId } from './common';
export interface DrawingPath {
  points: Point[];
  color: Color;
  width: StrokeWidth;
  timestamp: Timestamp;
  videoTime?: VideoPosition;
  globalTimeOffset?: TimelinePosition;
  timeOffset?: TimelinePosition;
  id?: EntityId;
}
export interface AnnotationCanvasProps {
  width: number;
  height: number;
  isEnabled: boolean;
  currentTime: number;
  isRecording?: boolean;
  isReplaying?: boolean;
  onAnnotationAdded?: (path: DrawingPath) => void;
  replayAnnotations?: DrawingPath[];
  toolColor?: Color;
  toolWidth?: StrokeWidth;
  clearCanvas?: boolean;
  onClearComplete?: () => void;
}
export interface AnnotationState {
  isDrawingEnabled: boolean;
  currentColor: Color;
  currentWidth: StrokeWidth;
  paths: DrawingPath[];
  lastClearTime: TimelinePosition;
}
export interface AnnotationCanvasRef {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  allDrawings: DrawingPath[];
  getContext: () => CanvasRenderingContext2D | null;
  clearCanvasDrawings: () => void;
  handleManualAnnotation: (path: DrawingPath) => void;
}