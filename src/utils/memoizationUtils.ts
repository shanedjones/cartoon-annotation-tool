/**
 * Utility functions for component memoization and performance optimizations
 */

import { useRef, useEffect, useCallback, DependencyList } from 'react';

/**
 * Memoize an expensive computation with dependency tracking
 * 
 * @param callback The function to memoize
 * @param dependencies The dependencies that should trigger recomputation
 * @returns The memoized result
 */
export function useMemoizedValue<T>(callback: () => T, dependencies: DependencyList): T {
  const resultRef = useRef<T | null>(null);
  const lastDepsRef = useRef<DependencyList | null>(null);
  
  let needsUpdate = false;
  
  if (lastDepsRef.current === null) {
    needsUpdate = true;
  } else if (dependencies.length !== lastDepsRef.current.length) {
    needsUpdate = true;
  } else {
    for (let i = 0; i < dependencies.length; i++) {
      if (!Object.is(dependencies[i], lastDepsRef.current[i])) {
        needsUpdate = true;
        break;
      }
    }
  }
  
  if (needsUpdate) {
    resultRef.current = callback();
    lastDepsRef.current = dependencies;
  }
  
  return resultRef.current as T;
}

/**
 * Creates a memoized callback function with explicit equality checks
 * 
 * @param callback The function to memoize
 * @param dependencies The dependencies that should trigger a new function
 * @returns The memoized callback function
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: DependencyList
): T {
  return useCallback(callback, dependencies);
}

/**
 * Compare objects deeply for changes
 * Useful for custom memoization logic
 */
export function deepCompareEquals(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }
  
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) {
    return false;
  }
  
  return keysA.every(key => 
    Object.prototype.hasOwnProperty.call(b, key) && deepCompareEquals(a[key], b[key])
  );
}

/**
 * Custom hook to use deep comparison for dependencies instead of reference equality
 */
export function useDeepCompareMemoize<T>(value: T): T {
  const ref = useRef<T>(value);
  
  if (!deepCompareEquals(value, ref.current)) {
    ref.current = value;
  }
  
  return ref.current;
}

/**
 * Custom hook similar to useEffect but with deep equality comparison of dependencies
 */
export function useDeepCompareEffect(
  callback: React.EffectCallback,
  dependencies: DependencyList
) {
  useEffect(callback, dependencies.map(dep => useDeepCompareMemoize(dep)));
}

/**
 * Create a stable object reference that merges updates while preserving identity
 * Useful for props that need to maintain reference equality
 */
export function useStableObject<T extends object>(obj: T): T {
  const ref = useRef<T>({} as T);
  
  // Update ref.current with new properties while maintaining identity
  Object.keys(obj).forEach(key => {
    (ref.current as any)[key] = (obj as any)[key];
  });
  
  return ref.current;
}

/**
 * Creates a debounced version of a function
 * Useful for performance optimization with repeated rapid calls
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  dependencies: DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [delay, ...dependencies]);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback as T;
}

/**
 * Creates a throttled version of a function
 * Useful for performance optimization with continuous events
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  dependencies: DependencyList = []
): T {
  const lastExecuted = useRef<number>(0);
  const pendingArgs = useRef<Parameters<T> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastExecuted.current;
    
    // Store the latest arguments
    pendingArgs.current = args;
    
    // If enough time has passed, execute immediately
    if (timeSinceLastCall >= delay) {
      lastExecuted.current = now;
      callback(...args);
      pendingArgs.current = null;
    } else {
      // Otherwise, set a timeout to execute later if there isn't one already
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          if (pendingArgs.current) {
            lastExecuted.current = Date.now();
            callback(...pendingArgs.current);
            pendingArgs.current = null;
          }
          timeoutRef.current = null;
        }, delay - timeSinceLastCall);
      }
    }
  }, [delay, ...dependencies]);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return throttledCallback as T;
}