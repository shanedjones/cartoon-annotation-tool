import { useReducer, Reducer, Dispatch, useCallback } from 'react';
import { createContextFactory, ContextFactoryOptions, ContextMiddleware } from './createContext';

export interface ReducerContextValue<State, Action> {
  state: State;
  dispatch: Dispatch<Action>;
  [key: string]: any;
}

export interface ReducerContextOptions<State, Action> extends ContextFactoryOptions<ReducerContextValue<State, Action>> {
  actionLogging?: boolean;
  stateTransformers?: ((state: State) => State)[];
}

/**
 * Creates a reducer-based context with enhanced features
 * 
 * @param displayName - The name of the context for debugging
 * @param reducer - The reducer function
 * @param initialState - The initial state
 * @param actionCreators - Object of action creator functions
 * @param options - Configuration options
 */
export function createReducerContext<State, Action>(
  displayName: string,
  reducer: Reducer<State, Action>,
  initialState: State,
  actionCreators: Record<string, (...args: any[]) => Action> = {},
  options?: ReducerContextOptions<State, Action>
) {
  const {
    actionLogging = false,
    stateTransformers = [],
    ...factoryOptions
  } = options || {};

  // Create a custom logging middleware if enabled
  const loggingMiddleware: ContextMiddleware<ReducerContextValue<State, Action>> = (value) => {
    if (actionLogging && process.env.NODE_ENV === 'development') {
      const originalDispatch = value.dispatch;
      
      // Enhanced dispatch function with logging
      const dispatchWithLogging: Dispatch<Action> = (action) => {
        console.log(`[${displayName} Dispatch]`, action);
        const result = originalDispatch(action);
        console.log(`[${displayName} New State]`, value.state);
        return result;
      };
      
      return {
        ...value,
        dispatch: dispatchWithLogging
      };
    }
    
    return value;
  };
  
  // Combine middleware
  const middleware = [...(factoryOptions.middleware || []), loggingMiddleware];

  return createContextFactory<ReducerContextValue<State, Action>>(
    displayName,
    null,
    () => {
      // Apply any state transformers to initial state
      const transformedInitialState = stateTransformers.reduce(
        (state, transformer) => transformer(state),
        initialState
      );
      
      const [state, dispatch] = useReducer(reducer, transformedInitialState);
      
      // Bind action creators with dispatch
      const boundActionCreators = Object.entries(actionCreators).reduce(
        (acc, [key, actionCreator]) => ({
          ...acc,
          [key]: useCallback(
            (...args: any[]) => dispatch(actionCreator(...args)),
            [dispatch]
          ),
        }),
        {} as Record<string, (...args: any[]) => void>
      );
      
      // Create the context value
      const contextValue = {
        state,
        dispatch,
        ...boundActionCreators,
      };
      
      return contextValue;
    },
    {
      ...factoryOptions,
      middleware
    }
  );
}