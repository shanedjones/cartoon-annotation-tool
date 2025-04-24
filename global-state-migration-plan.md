# Global State Migration Plan

## Phase 1: Analysis and Preparation

### 1.1 Audit of Existing Global State

The current codebase uses the following global window object properties:

| Window Object Property | Purpose | Current Usage |
|------------------------|---------|---------------|
| `window.__videoPlayerWrapper` | Exposes methods for recording category changes and tracking recording status | Used by app/page.tsx and other components to communicate with VideoPlayerWrapper |
| `window.__hasRecordedSession` | Indicates whether a recorded session is available for replay | Controls UI element availability in various components |
| `window.__isCompletedVideo` | Indicates if the current video is a completed review | Prevents auto-starting replay for completed videos |
| `window.__sessionReady` | Indicates when a session is fully loaded and ready for replay | Coordinates loading state between components |
| `window.__isReplaying` | Indicates if a session is currently being replayed | Updates UI elements during replay |
| `window.__globalTimePosition` | Stores the current position in the global timeline | Provides synchronization for timeline-based components |
| `window.__lastClearTime` | Stores the timestamp when annotations were last cleared | Used to filter annotations during replay |

### 1.2 Context Analysis

The codebase currently has the following contexts:

| Context | Responsibility | Current Implementation |
|---------|----------------|------------------------|
| AnnotationContext | Manages annotation state, tools, and visibility | Handles drawing paths, annotation tools, filtering based on time |
| SessionContext | Manages feedback session data and recording state | Tracks session information, category ratings, recording status |
| TimelineContext | Manages timeline position and events | Controls current time position, events, and playback status |
| VideoContext | Manages video playback state and controls | Handles video player state, playback controls, and source URLs |
| AuthContext | Manages user authentication | Handles login state and user profile data |

### 1.3 Mapping Global State to Contexts

Based on the analysis, here's how global window properties should map to React contexts:

| Window Object Property | Target Context | Purpose |
|------------------------|----------------|---------|
| `window.__videoPlayerWrapper` | SessionContext | Provides recording methods and state |
| `window.__hasRecordedSession` | SessionContext | Tracks session availability |
| `window.__isCompletedVideo` | SessionContext | Indicates completed review status |
| `window.__sessionReady` | SessionContext | Tracks session readiness for replay |
| `window.__isReplaying` | TimelineContext | Indicates active replay status |
| `window.__globalTimePosition` | TimelineContext | Tracks current timeline position |
| `window.__lastClearTime` | AnnotationContext | Stores last annotation clear timestamp |

## Phase 2: Context Refinement Implementation

### 2.1 Context Structure Improvements

Based on analysis, we'll implement the following changes with a hard cutover approach:

1. **Enhanced SessionContext**
   - Add methods and state to fully replace window globals
   - Expose clear API for session management

2. **Enhanced TimelineContext**
   - Add replay status state and methods
   - Remove all dependencies on window globals
   - Expose timeline position through context only

3. **Enhanced AnnotationContext**
   - Maintain lastClearTime internally
   - Implement proper synchronization with TimelineContext
   - Remove all window global dependencies

4. **AppProviders Optimization**
   - Ensure proper context nesting order
   - Add comprehensive error handling

### 2.2 Detailed Context Implementations

#### SessionContext Enhancements:
```typescript
interface SessionContextType {
  // Session state
  hasRecordedSession: boolean;
  isCompletedVideo: boolean;
  sessionReady: boolean;
  currentSession: FeedbackSession | null;
  
  // Session methods
  recordCategoryChange: (category: string, rating: number) => void;
  setSessionAvailable: (available: boolean) => void;
  setCompletedVideo: (completed: boolean) => void;
  setSessionReady: (ready: boolean) => void;
  
  // Other session management methods
  startRecording: () => void;
  stopRecording: () => void;
  startReplay: () => void;
  stopReplay: () => void;
}
```

#### TimelineContext Enhancements:
```typescript
interface TimelineContextType {
  // Timeline state
  globalTimePosition: number;
  isReplaying: boolean;
  replayProgress: number;
  
  // Timeline methods
  setGlobalTimePosition: (position: number) => void;
  setReplaying: (replaying: boolean) => void;
  updateReplayProgress: (progress: number) => void;
  
  // Other timeline methods
  seekTo: (position: number) => void;
  clearTimeline: () => void;
}
```

#### AnnotationContext Enhancements:
```typescript
interface AnnotationContextType {
  // Annotation state
  lastClearTime: number;
  annotations: DrawingPath[];
  
  // Annotation methods
  setLastClearTime: (time: number) => void;
  addAnnotation: (annotation: DrawingPath) => void;
  clearAnnotations: () => void;
  
  // Utilities
  getVisibleAnnotations: (timePosition: number) => DrawingPath[];
  isAnnotationVisibleAtTime: (annotation: DrawingPath, time: number) => boolean;
}
```

## Phase 3: Hard Cutover Implementation

### 3.1 Implementation Steps

1. **Update Context Providers**
   - Implement enhanced contexts with all required state and methods
   - Remove all window global references from context implementation
   - Add detailed JSDoc to document context APIs

2. **Update Key Components**
   - Identify all components that use window globals
   - Refactor them to use context hooks instead
   - Remove all window global references

3. **Fix Component Interactions**
   - Update component communication to use context rather than globals
   - Ensure events are properly communicated through context

### 3.2 Component-Specific Changes

#### VideoPlayerWrapper.tsx:
- Replace all window global assignments with context updates
- Use useSessionContext() hook to access and update session state
- Remove all direct window object references

#### FeedbackOrchestrator.tsx:
- Connect directly to TimelineContext and SessionContext
- Remove internal state that duplicates context state
- Update all methods to use context rather than globals

#### app/page.tsx:
- Replace all window global access with context hooks
- Update UI state based on context values
- Implement event handlers that update context rather than globals

## Phase 4: Testing and Validation

### 4.1 Validation Approach

1. **Comprehensive Testing**
   - Test all major workflows: recording, replay, session management
   - Verify components correctly use context state
   - Ensure no regressions in functionality

2. **Code Review**
   - Verify all window global references are removed
   - Check for any remaining direct DOM manipulation
   - Ensure context usage follows best practices

3. **Performance Verification**
   - Test application performance after changes
   - Monitor component render counts
   - Verify no memory leaks

### 4.2 Documentation

1. **Update Component Documentation**
   - Document new context-based approach
   - Add comments explaining context usage

2. **Developer Guidelines**
   - Create guidelines for future context usage
   - Document the context hierarchy and responsibilities

## Benefits of Direct Cutover Approach

1. **Clean Implementation**
   - No legacy code or compatibility layers
   - Simpler codebase with consistent patterns

2. **Improved Developer Experience**
   - TypeScript provides better autocompletion and type checking
   - Errors are caught at compile time rather than runtime

3. **Better Testing**
   - Components can be tested in isolation
   - Contexts can be mocked for unit testing

4. **Performance Improvements**
   - More efficient renders with proper context usage
   - No overhead from dual state management

5. **Future-Proof Architecture**
   - Follows React best practices
   - Easier to maintain and extend