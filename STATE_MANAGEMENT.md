# State Management

This document describes the centralized state management system implemented in the Cartoon Annotation Tool.

## Overview

The application uses a Context+Reducer pattern to manage state across multiple domains. This approach provides:

- Centralized state with clear domain boundaries
- Type-safe state updates through typed reducers
- Improved debugging with Redux DevTools integration
- Better performance by minimizing unnecessary re-renders
- Reduced prop drilling with context-based hooks

## State Structure

The state is organized into these distinct domains:

```
AppState
├── Auth
│   ├── user
│   └── status (loading/authenticated/error)
├── Session
│   ├── currentSession
│   └── sessionHistory
├── Media
│   ├── video (playback state, sources)
│   └── audio (recording state, chunks)
├── Timeline
│   ├── position
│   ├── events
│   └── markers
└── Annotation
    ├── paths
    ├── tools
    └── visibility
```

## Implementation

Each domain follows a consistent pattern:

### Directory Structure

Each domain has its own directory with these files:
- `reducer.ts` - State reducer with action types
- `context.tsx` - Context provider
- `hooks.ts` - Custom hooks for accessing state and actions

### Core Files

- `state/types.ts` - Type definitions for all state domains
- `state/utils.ts` - Helper functions for reducers and DevTools
- `state/store.tsx` - Root state provider that composes all domains
- `state/index.ts` - Public API exports
- `state/compatibility.ts` - Bridge for backward compatibility with global window objects

## Usage

### Accessing State

Import specific hooks for the domain you need:

```tsx
// Access auth state
import { useAuth, useAuthActions } from '@/state/auth/hooks';

function ProfileComponent() {
  const { user, status } = useAuth();
  const { signout } = useAuthActions();
  
  if (status === 'loading') return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button onClick={signout}>Sign out</button>
    </div>
  );
}
```

### Composing Components

The root `AppStateProvider` automatically includes all domain providers, and we use the `AppWrapper` component to ensure consistent layout and state management:

```tsx
// App entry point
import { AppWrapper } from '@/src/components/AppWrapper';

export default function RootLayout({ children }) {
  return (
    <AppWrapper>
      {children}
    </AppWrapper>
  );
}
```

The `AppWrapper` handles:
1. Providing the state context through `AppStateProvider`
2. Rendering the `Navbar` component
3. Adding consistent layout styling
4. Ensuring all child components have access to the state system

## Development Tools

The state system integrates with Redux DevTools for easier debugging:

1. Install the Redux DevTools browser extension
2. State changes are automatically logged with domain namespaces
3. Time-travel debugging is available to step through state changes

## Global Compatibility

During the transition period, the system maintains compatibility with legacy window globals:

- `window.__globalTimePosition`
- `window.__hasRecordedSession`
- `window.__isCompletedVideo`
- `window.__sessionReady`
- `window.__isReplaying`
- `window.__lastClearTime`
- `window.__videoPlayerWrapper`

These globals are kept in sync with the new state system through the `GlobalCompatibilityProvider`.

## Testing

The state system is tested through:

1. Unit tests for each reducer
2. Integration tests for hooks
3. The state-test page at `/state-test` for manual verification

## Future Improvements

Planned enhancements to the system:

1. Persistence layer for state with localStorage/IndexedDB
2. Performance optimization via selective re-rendering
3. Complete removal of window globals
4. Middleware for handling side effects more cleanly