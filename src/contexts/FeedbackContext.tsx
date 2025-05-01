'use client';

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  ReactNode
} from 'react';
import type { CategoryRatings } from '../types';

interface FeedbackState {
  categories: CategoryRatings;
}

type FeedbackActionType =
  | { type: 'SET_CATEGORY'; payload: { category: string; rating: number | null } }
  | { type: 'CLEAR_CATEGORIES' }
  | { type: 'SET_CATEGORIES'; payload: { categories: CategoryRatings } }
  | { type: 'RESET' };

interface FeedbackContextType {
  state: FeedbackState;
  setCategory: (category: string, rating: number | null) => void;
  clearCategories: () => void;
  setCategories: (categories: CategoryRatings) => void;
  reset: () => void;
}

const initialState: FeedbackState = {
  categories: {},
};

function feedbackReducer(state: FeedbackState, action: FeedbackActionType): FeedbackState {
  switch (action.type) {
    case 'SET_CATEGORY': {
      const { category, rating } = action.payload;
      return {
        ...state,
        categories: {
          ...state.categories,
          [category]: rating,
        },
      };
    }
    case 'CLEAR_CATEGORIES':
      return {
        ...state,
        categories: {},
      };
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload.categories,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const FeedbackContext = createContext<FeedbackContextType | null>(null);

interface FeedbackProviderProps {
  children: ReactNode;
  onCategoriesCleared?: () => void;
  onCategoriesLoaded?: (categories: Record<string, number>) => void;
}

export function FeedbackProvider({ 
  children,
  onCategoriesCleared,
  onCategoriesLoaded
}: FeedbackProviderProps) {
  const [state, dispatch] = useReducer(feedbackReducer, initialState);

  const setCategory = useCallback((category: string, rating: number | null) => {
    dispatch({ type: 'SET_CATEGORY', payload: { category, rating } });
  }, []);

  const clearCategories = useCallback(() => {
    dispatch({ type: 'CLEAR_CATEGORIES' });
    if (onCategoriesCleared) {
      onCategoriesCleared();
    }
  }, [onCategoriesCleared]);

  const setCategories = useCallback((categories: CategoryRatings) => {
    dispatch({ type: 'SET_CATEGORIES', payload: { categories } });
    if (onCategoriesLoaded) {
      const numberCategories: Record<string, number> = {};
      Object.entries(categories).forEach(([key, value]) => {
        numberCategories[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value as number;
      });
      onCategoriesLoaded(numberCategories);
    }
  }, [onCategoriesLoaded]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const contextValue = useMemo(() => ({
    state,
    setCategory,
    clearCategories,
    setCategories,
    reset,
  }), [state, setCategory, clearCategories, setCategories, reset]);

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}

export function useCategories() {
  const { state, setCategory, clearCategories, setCategories } = useFeedback();
  return {
    categories: state.categories,
    setCategory,
    clearCategories,
    setCategories,
  };
}