/**
 * Utilities for optimizing state management and reducing unnecessary re-renders
 */

import { useCallback, useRef, useMemo, useState, useReducer, Reducer, useEffect } from 'react';

/**
 * Custom hook to create a stable reference to a function
 * Prevents unnecessary re-renders due to function reference changes
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  
  // Update the ref if the callback changes
  callbackRef.current = callback;
  
  // Return a stable function that calls the current callback
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * State selector hook that prevents re-renders when irrelevant state changes
 * Works similar to Redux's useSelector
 */
export function useStateSelector<TState, TSelected>(
  state: TState,
  selector: (state: TState) => TSelected,
  equalityFn: (prev: TSelected, next: TSelected) => boolean = Object.is
): TSelected {
  // Memoize the selector function
  const memoizedSelector = useCallback(selector, [selector]);
  
  // Store the previous selected state
  const prevSelectedRef = useRef<TSelected | undefined>(undefined);
  
  // Select the current state
  const selectedState = memoizedSelector(state);
  
  // Check if the selected state has changed
  if (
    prevSelectedRef.current === undefined ||
    !equalityFn(prevSelectedRef.current, selectedState)
  ) {
    prevSelectedRef.current = selectedState;
  }
  
  // Always return the same reference if the selected state is equivalent
  return prevSelectedRef.current as TSelected;
}

/**
 * Hook for creating a more optimized reducer
 * Prevents unnecessary re-renders by comparing state changes
 */
export function useEqualityReducer<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  equalityFn: (prev: S, next: S) => boolean = (prev, next) => {
    if (prev === next) return true;
    if (typeof prev !== 'object' || prev === null || typeof next !== 'object' || next === null) {
      return false;
    }
    return Object.keys(prev).every(
      key => Object.prototype.hasOwnProperty.call(next, key) && 
             (prev as any)[key] === (next as any)[key]
    );
  }
): [S, React.Dispatch<A>] {
  const [state, dispatch] = useReducer(
    (prevState: S, action: A) => {
      const nextState = reducer(prevState, action);
      
      // Only update state if it has changed according to the equality function
      return equalityFn(prevState, nextState) ? prevState : nextState;
    },
    initialState
  );
  
  return [state, dispatch];
}

/**
 * Creates a "selector map" for efficiently extracting multiple values from state
 */
export function createSelectorMap<TState, TSelectors extends Record<string, (state: TState) => any>>(
  selectors: TSelectors
): (state: TState) => { [K in keyof TSelectors]: ReturnType<TSelectors[K]> } {
  return (state: TState) => {
    const result: any = {};
    
    for (const [key, selector] of Object.entries(selectors)) {
      result[key] = selector(state);
    }
    
    return result;
  };
}

/**
 * Hook for creating derived state that only updates when its dependencies change
 */
export function useDerivedState<TState, TDerived>(
  state: TState,
  deriveFn: (state: TState) => TDerived,
  dependencies: any[] = []
): TDerived {
  return useMemo(() => deriveFn(state), [state, ...dependencies]);
}

/**
 * Implementation of state with setters for individual properties
 * Allows for more granular state updates
 */
export function useStateObject<T extends Record<string, any>>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  
  // Create optimized setters for each property
  const setters = useMemo(() => {
    const setterMap: Record<string, (value: any) => void> = {};
    
    for (const key of Object.keys(initialState)) {
      setterMap[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] = 
        (value: any) => setState(prev => ({ ...prev, [key]: value }));
    }
    
    return setterMap;
  }, []);
  
  // Create a stable reference to combined state and setters
  return useMemo(() => ({ ...state, ...setters }), [state, setters]);
}

/**
 * Batches multiple state updates together to prevent cascade re-renders
 */
export function useBatchedUpdates<T extends Record<string, any>>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdatesRef = useRef<Partial<T>>({});
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create individual property setters
  const createSetter = useCallback((key: keyof T) => {
    return (value: T[typeof key]) => {
      // Store update in pending updates
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        [key]: value
      };
      
      // Schedule batch update if not already scheduled
      if (!batchTimeoutRef.current) {
        batchTimeoutRef.current = setTimeout(() => {
          // Apply all pending updates in a single state update
          setState(prev => ({ ...prev, ...pendingUpdatesRef.current }));
          
          // Reset pending updates and timeout ref
          pendingUpdatesRef.current = {};
          batchTimeoutRef.current = null;
        }, 0);
      }
    };
  }, []);
  
  // Create setters for all properties
  const setters = useMemo(() => {
    const setterMap: Record<string, (value: any) => void> = {};
    
    for (const key of Object.keys(initialState)) {
      setterMap[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] = 
        createSetter(key as keyof T);
    }
    
    // Add a batch update function
    setterMap.batchUpdate = (updates: Partial<T>) => {
      for (const [key, value] of Object.entries(updates)) {
        pendingUpdatesRef.current[key as keyof T] = value;
      }
      
      // Schedule batch update if not already scheduled
      if (!batchTimeoutRef.current) {
        batchTimeoutRef.current = setTimeout(() => {
          // Apply all pending updates in a single state update
          setState(prev => ({ ...prev, ...pendingUpdatesRef.current }));
          
          // Reset pending updates and timeout ref
          pendingUpdatesRef.current = {};
          batchTimeoutRef.current = null;
        }, 0);
      }
    };
    
    return setterMap;
  }, [createSetter]);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);
  
  // Return state and setters
  return { ...state, ...setters };
}