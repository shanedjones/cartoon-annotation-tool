# State Management Migration Status

This document provides an overview of the state management migration for the Cartoon Annotation Tool.

## Overview

The application is in the process of migrating from a multiple-context approach to a more structured state management system. The new system provides:

- Clear domain separation with specific state slices
- Bidirectional compatibility with legacy window global variables
- Better type safety and developer experience
- Improved performance through selective renders

## Current Status

The migration follows an inside-out approach, where core state management is established first and UI components are gradually updated to use it.

### Completed

- Core state system implementation in `/src/state/`
- Domain-specific state slices:
  - Authentication
  - Session management
  - Timeline
  - Annotation
  - Media (Video/Audio)
- Compatibility layer for window globals
- Application provider structure

### In Progress

- Component migration:
  - VideoPlayer (partially migrated)
  - AnnotationCanvas (partially migrated)
  - AudioRecorder (partially migrated)

### Remaining

- Complete DOM manipulation removal in favor of state-driven updates
- Performance optimizations:
  - Add memoization where needed
  - Implement selective rendering with useMemo/React.memo
- Remove direct window global usage

## Architecture

The new state management system is organized as follows:

```
/src/state/
  ├── index.ts                # Public API exports
  ├── store.tsx               # Root state provider
  ├── compatibility.tsx       # Legacy system compatibility layer
  ├── types.ts                # Shared type definitions
  ├── utils.ts                # Helper utilities
  ├── annotation/             # Annotation state domain
  │   ├── context.tsx         # Provider implementation
  │   ├── hooks.ts            # Domain-specific hooks 
  │   └── reducer.ts          # State reducer
  ├── auth/                   # Authentication state domain
  ├── media/                  # Media (video/audio) state domain
  ├── session/                # Session state domain
  └── timeline/               # Timeline state domain
```

## Usage Guidelines

When working with state in components:

### Accessing State

```tsx
import { useVideo, useAnnotation, useTimeline } from '@/state';

function MyComponent() {
  // Access specific domain state
  const videoState = useVideo();
  const annotationState = useAnnotation();
  const timelineState = useTimeline();
  
  // Use state properties
  const { isPlaying, currentTime } = videoState;
  
  // ...
}
```

### Performing Actions

```tsx
import { useMediaActions, useAnnotationActions } from '@/state';

function MyComponent() {
  // Get action creators
  const mediaActions = useMediaActions();
  const annotationActions = useAnnotationActions();
  
  // Example action handlers
  const handlePlay = () => mediaActions.play();
  const handleClearAnnotations = () => annotationActions.clearPaths();
  
  // ...
}
```

### Working with Annotations

```tsx
import { useVisibleAnnotations, useTimelinePosition } from '@/state';

function MyComponent() {
  // Get the current timeline position
  const { position } = useTimelinePosition();
  
  // Get annotations visible at the current time
  const visibleAnnotations = useVisibleAnnotations(position);
  
  // ...
}
```

## Next Steps

1. Continue migrating components to use the state system
2. Remove direct DOM manipulation where possible
3. Replace window global usage with state hooks
4. Implement performance optimizations
5. Update unit tests to work with new state architecture
6. Document the final architecture for future development