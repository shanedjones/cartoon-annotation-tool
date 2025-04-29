import { EntityId, Dictionary } from './common';
export interface DataLabelingProperty {
  id: string;
  label: string;
}
export interface KeyMetric {
  name: string;
  value: string | number;
}
export interface ReviewContent {
  videoUrl: string;
  videoTitle?: string;
  videoDescription?: string;
  dataLabelingTitle: string;
  labelProperties: DataLabelingProperty[];
  keyMetricsTitle?: string;
  keyMetrics?: KeyMetric[];
}
export interface VideoPlayerWrapperProps {
  categories?: Dictionary<number | null>;
  onCategoriesCleared?: () => void;
  onCategoriesLoaded?: (categories: Dictionary<number | boolean>) => void;
  onReplayModeChange?: (isReplay: boolean) => void;
  videoUrl?: string;
  videoId?: string;
  contentToReview?: any;
}
export interface StarRatingProps {
  categoryId: string;
  value: number | null;
  onChange: (categoryId: string, value: number) => void;
  disabled?: boolean;
  maxRating?: number;
}
export interface GlobalExtensions {
  __videoPlayerWrapper?: {
    recordCategoryChange: (category: string, rating: number) => void;
    isRecording: boolean;
  };
  __globalTimePosition?: number;
  __lastClearTime?: number;
  __hasRecordedSession?: boolean;
}