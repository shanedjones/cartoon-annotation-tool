/**
 * Type definitions for UI components and structures
 */
import { Dictionary } from './common';

/**
 * Data labeling property for review
 */
export interface DataLabelingProperty {
  /** Unique identifier for the property */
  id: string;
  /** Display label for the property */
  label: string;
}

/**
 * Key metric for display
 */
export interface KeyMetric {
  /** Name of the metric */
  name: string;
  /** Value of the metric (string or number) */
  value: string | number;
}

/**
 * Content to be reviewed
 */
export interface ReviewContent {
  /** URL to the video being reviewed */
  videoUrl: string;
  /** Title of the video */
  videoTitle?: string;
  /** Description of the video */
  videoDescription?: string;
  /** Title for the data labeling section */
  dataLabelingTitle: string;
  /** Properties that can be labeled */
  labelProperties: DataLabelingProperty[];
  /** Title for the key metrics section */
  keyMetricsTitle?: string;
  /** Metrics to display */
  keyMetrics?: KeyMetric[];
}

/**
 * Properties for the VideoPlayerWrapper component
 */
export interface VideoPlayerWrapperProps {
  /** Category ratings */
  categories?: Dictionary<number | null>;
  /** Callback when categories are cleared */
  onCategoriesCleared?: () => void;
  /** Callback when categories are loaded */
  onCategoriesLoaded?: (categories: Dictionary<number | boolean>) => void;
  /** Callback when replay mode changes */
  onReplayModeChange?: (isReplay: boolean) => void;
  /** URL to the video */
  videoUrl?: string;
  /** Identifier for the video */
  videoId?: string;
  /** Content to be reviewed */
  contentToReview?: ReviewContent;
}

/**
 * Properties for the star rating component
 */
export interface StarRatingProps {
  /** Category identifier */
  categoryId: string;
  /** Current rating value */
  value: number | null;
  /** Callback when rating changes */
  onChange: (categoryId: string, value: number) => void;
  /** Whether the rating is disabled */
  disabled?: boolean;
  /** Maximum rating value */
  maxRating?: number;
}

/**
 * Global window extensions
 */
export interface GlobalExtensions {
  /** VideoPlayerWrapper access */
  __videoPlayerWrapper?: {
    /** Method to record a category change */
    recordCategoryChange: (category: string, rating: number) => void;
    /** Whether recording is active */
    isRecording: boolean;
  };
  /** Global timeline position in milliseconds */
  __globalTimePosition?: number;
  /** Time when canvas was last cleared */
  __lastClearTime?: number;
  /** Whether a recorded session is available */
  __hasRecordedSession?: boolean;
}