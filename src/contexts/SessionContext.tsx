'use client';

import { 
  FeedbackSessionProvider,
  useSession,
  useCategories,
  useSessionAvailability
} from './factory/feedbackSessionFactory';

// Re-export with SessionProvider alias
export { 
  FeedbackSessionProvider as SessionProvider,
  useSession,
  useCategories,
  useSessionAvailability
};