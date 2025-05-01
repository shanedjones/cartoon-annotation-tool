import { Color, StrokeWidth, CategoryRatings } from './common';

export type DrawingTool = 'freehand' | 'line';

export interface DrawingToolsState {
  toolColor: Color;
  toolWidth: StrokeWidth;
  toolType: DrawingTool;
  isEnabled: boolean;
  shouldClearCanvas: boolean;
}

export interface FeedbackState {
  categories: CategoryRatings;
}