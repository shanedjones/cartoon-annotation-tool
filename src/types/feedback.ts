import { Color, StrokeWidth } from './common';

export type DrawingTool = 'freehand' | 'line';

export interface CategoryRatings {
  [category: string]: number | null;
}

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