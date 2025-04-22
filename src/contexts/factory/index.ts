// Export all context factory functions and types
export * from './createContext';
export * from './createReducerContext';

// Factory creators
export * from './annotationFactory';
export * from './authFactory';
export * from './feedbackSessionFactory';
export * from './sessionFactory';
export * from './timelineFactory';
export * from './videoFactory';

/**
 * Context Factory Pattern Documentation
 * -------------------------------------
 *
 * This module provides a standardized way to create React contexts with enhanced features.
 * 
 * Basic Usage:
 * 
 * 1. For simple contexts, use createContextFactory:
 * 
 *    const { Provider, useContextHook } = createContextFactory(
 *      'Example',       // Display name
 *      null,            // Default value
 *      () => {          // State creation function
 *        // Create and return your state here
 *        return { value: 'example' };
 *      },
 *      {                // Optional configuration
 *        enableMemoization: true,
 *        debugMode: true
 *      }
 *    );
 * 
 *    // Export your provider and hook
 *    export const ExampleProvider = Provider;
 *    export const useExample = useContextHook;
 * 
 * 2. For reducer-based contexts, use createReducerContext:
 * 
 *    const { Provider, useContextHook } = createReducerContext(
 *      'Example',             // Display name
 *      exampleReducer,        // Reducer function
 *      initialState,          // Initial state
 *      {                      // Action creators
 *        setValue: (value) => ({ type: 'SET_VALUE', payload: { value } })
 *      },
 *      {                      // Optional configuration
 *        actionLogging: true,
 *        debugMode: true
 *      }
 *    );
 * 
 *    // Export your provider and hook
 *    export const ExampleProvider = Provider;
 *    export const useExample = useContextHook;
 * 
 * Advanced Features:
 * 
 * - Middleware: Process context values before they're provided
 * - State Transformers: Transform initial state before reducer initialization
 * - Action Logging: Automatically log dispatched actions in development
 * - Memoization: Optimize rendering performance
 * 
 * For creating domain-specific factory functions, see annotationFactory.ts or videoFactory.ts as examples.
 */