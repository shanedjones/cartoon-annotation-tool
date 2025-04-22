// Public API for state management

// Re-export the store provider and hooks
export { AppStateProvider, useAppState } from './store';

// Re-export domain-specific hooks for easy access
export { useAuth, useAuthActions, useIsAuthenticated, useRequireAuth } from './auth/hooks';
export { useSession, useSessionActions } from './session/hooks';
export { useMedia, useVideo, useAudio, useMediaActions } from './media/hooks';
export { useTimeline, useTimelineActions, useTimelinePosition, useRecordingTime } from './timeline/hooks';
export { useAnnotation, useAnnotationActions, useVisibleAnnotations } from './annotation/hooks';

// Re-export DevTools utilities
export { initializeDevTools } from './utils';

// Re-export types
export type { 
  AppState,
  AuthState,
  SessionState,
  MediaState,
  TimelineState,
  AnnotationState,
  User,
  Session,
  Category,
  CategoryRating,
  VideoState,
  AudioState,
  TimelineEvent,
  TimelineMarker,
  AnnotationPath,
  AnnotationTool,
  Point
} from './types';