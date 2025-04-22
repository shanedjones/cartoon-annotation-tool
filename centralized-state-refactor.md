# Centralized State Management Refactoring

## Current State Analysis

The application currently manages state through multiple disconnected mechanisms:

1. **Multiple React Context Providers**:
   - `SessionContext`: Manages recording sessions and category data
   - `TimelineContext`: Handles timeline position and events
   - `AnnotationContext`: Controls drawing state and annotation visibility
   - `VideoContext`: Handles video playback state
   - `AuthContext`: Manages authentication state

2. **Global Window Objects**:
   - `window.__videoPlayerWrapper`
   - `window.__hasRecordedSession`
   - `window.__isCompletedVideo`
   - `window.__sessionReady`
   - `window.__isReplaying`
   - `window.__globalTimePosition`
   - `window.__lastClearTime`

3. **Internal Component State**:
   - Several components maintain their own internal state via `useState` that should be part of the global state
   - State duplication across components (especially in `VideoPlayerWrapper` and `FeedbackOrchestrator`)

## Problems with Current Approach

### 1. State Fragmentation and Redundancy
The current state management is fragmented across multiple contexts with overlapping concerns:
- Timeline position is stored in both `TimelineContext` and `window.__globalTimePosition`
- Recording state is managed between `SessionContext` and component-level state
- Categories appear in both `SessionContext` and as internal state in components

### 2. Poor State Visibility and Debugging
- Difficult to determine where state is defined and modified
- No single source of truth for important application states
- Global window objects bypass React's data flow, making issues harder to debug

### 3. Prop Drilling and Complex State Synchronization
- Complex synchronization logic between components
- Excessive prop drilling for passing state between components
- Manual state synchronization between contexts

### 4. Global State Pollution
- Use of window global variables creates potential naming conflicts
- Global state makes testing more difficult
- No type safety for global state objects

### 5. Inconsistent Update Patterns
- Mix of direct state updates and context operations
- Inconsistent use of the reducer pattern across contexts

## Proposed Solution

### 1. Unified State Structure with Clear Domain Boundaries

Create a centralized state management system with distinct, well-defined domains:

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

### 2. Implement Context + Reducer Architecture

Adopt a more structured approach using:

- A consistent reducer pattern for all state updates
- Context modules with clear boundaries of responsibility
- Custom hooks for domain-specific operations

Example structure:
```
/src
├── state/
│   ├── store.tsx                 # Root state container
│   ├── index.ts                  # Public API for state
│   ├── types.ts                  # State type definitions
│   ├── auth/
│   │   ├── context.tsx           # Auth context
│   │   ├── reducer.ts            # Auth state reducer
│   │   └── hooks.ts              # Auth-specific hooks
│   ├── session/
│   │   ├── context.tsx
│   │   ├── reducer.ts
│   │   └── hooks.ts
│   └── [other domains]...
```

### 3. Eliminate Global Window Objects

Replace all global window objects with proper state management:

1. Create custom hooks that encapsulate the functionality
2. Store all state in the appropriate context
3. Use React's built-in state management features

### 4. Implement Selector Pattern for State Access

Instead of directly accessing context, provide:

- Selector hooks for reading specific state slices
- Action hooks for modifying state in a controlled way

This creates a contract between components and state that's easier to maintain.

### 5. State Persistence Layer

Add a layer for persistent state when needed:

- Session storage for current session state
- Local storage for user preferences
- Proper serialization/deserialization of state

## Implementation Plan

### Phase 1: Initial Setup (2-3 days)

1. Create the basic state structure and types
2. Implement the root context provider
3. Set up the reducer architecture
4. Create initial selectors and actions

### Phase 2: Domain Migration (1-2 weeks)

Incrementally migrate each domain to the new system:

1. **Auth Domain** (1-2 days)
   - Simplest context to migrate
   - Replace current authentication with the new pattern

2. **Media Domain** (2-3 days)
   - Combine video and audio state
   - Create proper media control hooks

3. **Timeline Domain** (2-3 days)
   - Integrate position tracking
   - Create event management features

4. **Annotation Domain** (2-3 days)
   - Migrate drawing tools
   - Connect to timeline events

5. **Session Domain** (3-4 days)
   - Most complex domain
   - Connect all the pieces together

### Phase 3: Global Cleanup (2-3 days)

1. Remove all global window objects
2. Ensure all components use the new state system
3. Add comprehensive testing

### Phase 4: Performance Optimization (2-3 days)

1. Implement memoization for selectors
2. Add state persistence where needed
3. Optimize renders with proper dependency arrays

## Best Practices to Follow

1. **Clear Boundaries**: Each state domain should have a clear, non-overlapping responsibility
2. **Immutable Updates**: Always use immutable update patterns
3. **Typed State**: Use TypeScript interfaces for all state objects
4. **Selective Rendering**: Ensure components only re-render when necessary
5. **Action Creators**: Use action creators to standardize state changes
6. **Middleware Pattern**: For side effects and async operations
7. **Testing**: Write tests for reducers and selectors

## Expected Benefits

1. **Improved Developer Experience**:
   - Clear flow of data through the application
   - Easier to debug state-related issues
   - Better IDE support with TypeScript

2. **Better Performance**:
   - More granular control over component re-renders
   - Reduction of redundant state updates
   - More efficient state access

3. **Enhanced Maintainability**:
   - Easier to add new features
   - Clearer separation of concerns
   - More modular code organization

4. **Increased Reliability**:
   - Predictable state updates
   - Prevention of impossible states
   - Better error handling

## Migration Tips

1. **Incremental Approach**: Migrate one context at a time
2. **Coexistence Strategy**: Allow old and new state systems to work together during migration
3. **Top-Down Migration**: Start with higher-level components and work down
4. **Comprehensive Testing**: Add tests for each state domain
5. **Documentation**: Document the new state structure and update patterns

## Possible Libraries to Consider

While a custom solution using Context+Reducer pattern is recommended, these libraries could be considered:

1. **Redux Toolkit**: If a more structured approach is desired
2. **Zustand**: For a simpler, hooks-based state management
3. **Jotai/Recoil**: For atomic state management
4. **XState**: If state machines would help with complex flows

The recommended approach is to use React's built-in features (Context + useReducer) with a custom implementation, as this keeps dependencies minimal while providing sufficient structure.