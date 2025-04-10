/**
 * Global type declarations for the application
 */

// Extend the Window interface
interface Window {
  __videoPlayerWrapper?: {
    recordCategoryChange: (category: string, rating: number) => void;
    isRecording: boolean;
  };
  __hasRecordedSession?: boolean;
  __isCompletedVideo?: boolean;
  __sessionReady?: boolean;
  __isReplaying?: boolean;
  __globalTimePosition?: number;
  __lastClearTime?: number;
}