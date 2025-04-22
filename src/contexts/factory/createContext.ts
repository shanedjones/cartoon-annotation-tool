'use client';

import React, { createContext, useContext, ReactNode, Context, useMemo } from 'react';

// Define middleware type for context processing
export type ContextMiddleware<T> = (value: T) => T;

export interface ContextFactoryResult<T, A = any> {
  Provider: React.FC<{ children: ReactNode }>;
  useContextHook: () => T;
  Context: Context<T | null>;
}

export interface ContextFactoryOptions<T> {
  enableMemoization?: boolean;
  middleware?: ContextMiddleware<T>[];
  debugMode?: boolean;
}

/**
 * Enhanced context factory with middleware support and memoization
 */
export function createContextFactory<T, A = any>(
  displayName: string,
  defaultValue: T | null = null,
  createState: () => T,
  options?: ContextFactoryOptions<T>
): ContextFactoryResult<T, A> {
  // Default options
  const {
    enableMemoization = true,
    middleware = [],
    debugMode = false
  } = options || {};

  // Create context with display name
  const Context = createContext<T | null>(defaultValue);
  Context.displayName = displayName;
  
  // Create provider component
  const Provider = ({ children }: { children: ReactNode }) => {
    // Create the initial state
    const initialState = createState();
    
    // Apply middleware to the state
    const processedState = middleware.reduce(
      (state, middlewareFn) => middlewareFn(state),
      initialState
    );
    
    // Memoize the state if enabled
    const value = enableMemoization 
      ? useMemo(() => processedState, Object.values(processedState)) 
      : processedState;
    
    // Debug logging in development mode
    if (debugMode && process.env.NODE_ENV === 'development') {
      console.log(`[${displayName} Context]`, value);
    }
    
    return React.createElement(
      Context.Provider,
      { value },
      children
    );
  };
  
  // Create hook to consume the context
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