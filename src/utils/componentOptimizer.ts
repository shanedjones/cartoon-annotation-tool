/**
 * Utility for optimizing React components and helping with component organization
 */

import React, { useCallback, ReactNode, useState, useEffect } from 'react';
import { useDebounce, useThrottle } from './memoizationUtils';

/**
 * Performance analyzer for React components
 * This helps identify components that might need optimization
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    componentName?: string;
    threshold?: number; // Render time threshold in ms
    logToConsole?: boolean;
  }
): React.FC<P> {
  const displayName = options?.componentName || Component.displayName || Component.name || 'Component';
  const threshold = options?.threshold || 5; // Default 5ms threshold
  const logToConsole = options?.logToConsole ?? process.env.NODE_ENV !== 'production';
  
  const PerformanceTrackedComponent: React.FC<P> = (props) => {
    // Track render time
    const startTime = performance.now();
    
    // Reference to the component instance for use in useEffect
    const renderRef = React.useRef({ renderTime: 0, renderCount: 0 });
    
    // Increment render count
    renderRef.current.renderCount++;
    
    // After render, calculate render time
    useEffect(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      renderRef.current.renderTime = renderTime;
      
      // Log if over threshold
      if (logToConsole && renderTime > threshold) {
        console.warn(
          `[Performance] ${displayName} took ${renderTime.toFixed(2)}ms to render. ` +
          `This is above the ${threshold}ms threshold. ` +
          `Render count: ${renderRef.current.renderCount}`
        );
      }
    });
    
    return React.createElement(Component, props);
  };
  
  PerformanceTrackedComponent.displayName = `PerformanceTracked(${displayName})`;
  
  return PerformanceTrackedComponent;
}

/**
 * Component that renders its children only when visible in the viewport
 * Useful for deferring rendering of off-screen content
 */
export const LazyRender: React.FC<{
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
}> = ({ children, threshold = 0, rootMargin = '100px' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasRendered(true);
            // Unobserve after becoming visible
            if (ref.current) observer.unobserve(ref.current);
          }
        });
      },
      { threshold, rootMargin }
    );
    
    observer.observe(ref.current);
    
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [threshold, rootMargin]);
  
  return React.createElement(
    'div',
    { ref: ref, style: { minHeight: hasRendered ? 0 : '10px' } },
    isVisible ? children : null
  );
};

/**
 * HOC to make a component render only when visible in viewport
 */
export function withLazyRender<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    threshold?: number;
    rootMargin?: string;
  }
): React.FC<P> {
  const LazyRenderedComponent: React.FC<P> = (props) => (
    React.createElement(
      LazyRender,
      { threshold: options?.threshold, rootMargin: options?.rootMargin },
      React.createElement(Component, props)
    )
  );
  
  LazyRenderedComponent.displayName = `LazyRendered(${Component.displayName || Component.name || 'Component'})`;
  
  return LazyRenderedComponent;
}

/**
 * Custom hook to handle input debouncing
 * Helps optimize form inputs that trigger expensive operations
 */
export function useDebouncedInput<T = string>(
  initialValue: T,
  delay: number = 300
): [T, (value: T) => void, T] {
  const [inputValue, setInputValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  
  const debouncedSetValue = useDebounce((value: T) => {
    setDebouncedValue(value);
  }, delay);
  
  const handleChange = useCallback((value: T) => {
    setInputValue(value);
    debouncedSetValue(value);
  }, [debouncedSetValue]);
  
  return [inputValue, handleChange, debouncedValue];
}

/**
 * Higher-order component to avoid unnecessary re-renders
 * Uses React.memo with custom comparison function
 */
export function withMemoization<P extends object>(
  Component: React.ComponentType<P>,
  areEqual: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean = (prev, next) => {
    // Default shallow comparison of all props
    return Object.keys(prev).every(key => {
      return Object.prototype.hasOwnProperty.call(next, key) && 
        prev[key as keyof P] === next[key as keyof P];
    });
  }
): React.NamedExoticComponent<P> {
  const MemoizedComponent = React.memo(Component, areEqual);
  MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name || 'Component'})`;
  return MemoizedComponent;
}

/**
 * Hook to ensure that expensive calculations are only performed once
 * Useful for complex initializations or calculations
 */
export function useExpensiveComputation<T>(
  computation: () => T,
  dependencies: React.DependencyList = []
): T {
  const [value, setValue] = useState<T | null>(null);
  const hasComputedRef = React.useRef(false);
  
  useEffect(() => {
    if (!hasComputedRef.current) {
      const result = computation();
      setValue(result);
      hasComputedRef.current = true;
    }
  }, dependencies);
  
  if (value === null) {
    // If the value hasn't been computed yet, compute it synchronously
    // This should only happen on the first render
    const initialValue = computation();
    hasComputedRef.current = true;
    return initialValue;
  }
  
  return value;
}