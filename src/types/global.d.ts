interface Window {
  __videoPlayerWrapper?: {
    recordCategoryChange: (category: string, rating: number) => void;
    isRecording: boolean;
    startReplay?: () => void;
    stopReplay?: () => void;
    resetState?: () => void;
  };
  __hasRecordedSession?: boolean;
  __isCompletedVideo?: boolean;
  __sessionReady?: boolean;
  __isReplaying?: boolean;
  __globalTimePosition?: number;
  __lastClearTime?: number;
}