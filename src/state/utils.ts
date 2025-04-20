import { Dispatch } from 'react';

/**
 * Action type interface with required type property and optional payload
 */
export interface Action<T = string, P = any> {
  type: T;
  payload?: P;
}

/**
 * Type-safe action creator factory
 */
export function createAction<T extends string, P>(type: T, payload?: P): Action<T, P> {
  return { type, payload };
}

/**
 * Type-safe reducer factory that enforces state type
 */
export function createReducer<S, A extends Action = Action>(
  initialState: S,
  handlers: { [K in A['type']]?: (state: S, action: Extract<A, { type: K }>) => S }
) {
  return function reducer(state: S = initialState, action: A): S {
    const handler = handlers[action.type as A['type']];
    return handler ? handler(state, action as any) : state;
  };
}

/**
 * Type-safe action creator factory with dispatch binding
 */
export function createActionCreators<S, A extends Action = Action>(
  dispatch: Dispatch<A>
) {
  return {
    createAction: <T extends A['type'], P>(
      type: T,
      payload?: P
    ) => {
      const action = { type, payload } as unknown as A;
      dispatch(action);
      return action;
    },
  };
}

/**
 * Helper for immutable state updates
 */
export function updateObject<T>(oldObject: T, newValues: Partial<T>): T {
  return { ...oldObject, ...newValues };
}

/**
 * Helper for immutable array updates
 */
export function updateItemInArray<T>(
  array: T[],
  itemId: any,
  idKey: keyof T,
  updateItemCallback: (item: T) => T
): T[] {
  return array.map((item) => {
    if (item[idKey] !== itemId) {
      return item;
    }
    return updateItemCallback(item);
  });
}

/**
 * Create a Redux DevTools extension connection if available
 */
export function configureDevTools() {
  if (typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
    return (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect({
      name: 'Cartoon Annotation Tool State',
      features: {
        pause: true, // start/pause recording of dispatched actions
        lock: true, // lock/unlock dispatching actions and side effects
        persist: true, // persist states on page reloading
        export: true, // export history of actions in a file
        import: 'custom', // import history of actions from a file
        jump: true, // jump back and forth (time traveling)
        skip: true, // skip (cancel) actions
        reorder: true, // drag and drop actions in the history list
        dispatch: true, // dispatch custom actions or action creators
        test: true, // generate tests for the selected actions
      },
    });
  }
  
  return null;
}

/**
 * Global DevTools connection
 */
let devTools: any = null;

/**
 * Initialize DevTools if available
 * Call this once at app startup
 */
export function initializeDevTools() {
  if (process.env.NODE_ENV !== 'production') {
    devTools = configureDevTools();
  }
}

/**
 * Log action to DevTools
 */
export function logToDevTools(action: Action, state: any) {
  if (devTools) {
    devTools.send(action, state);
  }
}

/**
 * Higher-order function to wrap a reducer with DevTools logging
 */
export function withDevTools<S, A extends Action = Action>(
  reducer: (state: S, action: A) => S,
  namespace: string
) {
  return (state: S, action: A): S => {
    const nextState = reducer(state, action);
    
    if (devTools && process.env.NODE_ENV !== 'production') {
      // Log to DevTools with namespace for clarity
      logToDevTools(
        { ...action, type: `${namespace}/${action.type}` }, 
        { [namespace]: nextState }
      );
    }
    
    return nextState;
  };
}