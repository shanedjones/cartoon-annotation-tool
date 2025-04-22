# Context Creation Pattern Refactoring

## Problem Statement

The codebase currently has multiple React context implementations with significant duplication:
- `/src/contexts/AnnotationContext.tsx`
- `/src/contexts/VideoContext.tsx`
- `/src/contexts/TimelineContext.tsx`
- `/src/contexts/AuthContext.tsx`
- `/src/contexts/SessionContext.tsx`

Each context file repeats similar boilerplate:
- Creating context object with default value
- Setting up provider component with state
- Exporting context hook with null checks
- Implementing action creators and reducers
- Error handling patterns for context hooks

## Proposed Solution: Context Factory Pattern

### 1. Core Factory Function

Create a generic typed factory function that generates context providers:

```typescript
// /src/contexts/factory/createContext.ts
import { createContext, useContext, ReactNode, Context } from 'react';

interface ContextFactoryResult<T, A> {
  Provider: React.FC<{ children: ReactNode }>;
  useContextHook: () => T;
  Context: Context<T | null>;
  // Optional action creators could be included here
}

export function createContextFactory<T, A = any>(
  displayName: string,
  defaultValue: T | null = null,
  createState: () => T,
  // Optional reducer/actions setup
): ContextFactoryResult<T, A> {
  const Context = createContext<T | null>(defaultValue);
  Context.displayName = displayName;
  
  const Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const state = createState();
    return <Context.Provider value={state}>{children}</Context.Provider>;
  };
  
  const useContextHook = () => {
    const context = useContext(Context);
    if (context === null) {
      throw new Error(`use${displayName} must be used within a ${displayName}Provider`);
    }
    return context;
  };
  
  return {
    Provider,
    useContextHook,
    Context,
  };
}
```

### 2. Reducer Pattern Extension

For contexts using reducers, extend the factory:

```typescript
// /src/contexts/factory/createReducerContext.ts
import { useReducer, Reducer, Dispatch } from 'react';
import { createContextFactory } from './createContext';

export function createReducerContext<State, Action>(
  displayName: string,
  reducer: Reducer<State, Action>,
  initialState: State,
  actionCreators?: Record<string, (...args: any[]) => Action>
) {
  return createContextFactory(
    displayName,
    null,
    () => {
      const [state, dispatch] = useReducer(reducer, initialState);
      
      // Create a combined context value with state, dispatch, and bound action creators
      const contextValue = {
        state,
        dispatch,
        ...Object.entries(actionCreators || {}).reduce(
          (acc, [key, actionCreator]) => ({
            ...acc,
            [key]: (...args: any[]) => dispatch(actionCreator(...args)),
          }),
          {}
        ),
      };
      
      return contextValue;
    }
  );
}
```

### 3. Implementation Example

Refactoring an existing context using the factory:

```typescript
// Before: /src/contexts/VideoContext.tsx
// ... [All the existing context boilerplate code]

// After: /src/contexts/VideoContext.tsx
import { createReducerContext } from './factory/createReducerContext';

// Define state and action types
interface VideoState {
  // ... state properties
}

type VideoAction = 
  | { type: 'SET_VIDEO', payload: VideoData }
  | { type: 'TOGGLE_PLAY' }
  // ... other action types

// Define the reducer
function videoReducer(state: VideoState, action: VideoAction): VideoState {
  // ... reducer implementation
}

// Define initial state
const initialState: VideoState = {
  // ... initial state properties
};

// Define action creators
const actionCreators = {
  setVideo: (video: VideoData) => ({ type: 'SET_VIDEO', payload: video }),
  togglePlay: () => ({ type: 'TOGGLE_PLAY' }),
  // ... other action creators
};

// Create the context using the factory
export const { 
  Provider: VideoProvider, 
  useContextHook: useVideo,
  Context: VideoContext
} = createReducerContext(
  'Video',
  videoReducer,
  initialState,
  actionCreators
);
```

## Benefits

1. **Reduced Boilerplate**: Eliminates repetitive context setup code
2. **Consistency**: Ensures consistent patterns across all contexts
3. **Type Safety**: Leverages TypeScript for better type inference and safety
4. **Maintainability**: Centralizes context creation logic for easier updates
5. **Readability**: Makes context files more focused on state and business logic
6. **Error Handling**: Standardizes error messages and null checking
7. **Testability**: Makes it easier to test contexts in isolation

## Implementation Plan

1. Create the factory utility files
2. Refactor one context at a time, starting with simpler ones
3. Update imports in consumer components
4. Add comprehensive tests for the factory functions
5. Document the new pattern for team reference

## Future Extensions

- Add automatic debugging/logging capabilities
- Support for context persistence (localStorage, sessionStorage)
- Add memoization for optimized re-renders
- Support for async context initialization