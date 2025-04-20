'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { AppState } from './types';

// Import domain-specific providers
import { AuthSessionProvider, AuthProvider } from './auth/context';
import { SessionProvider } from './session/context';
import { MediaProvider } from './media/context';
import { TimelineProvider } from './timeline/context';
import { AnnotationProvider } from './annotation/context';

// Create a context for potential app-wide state/actions
const AppStateContext = createContext<AppState | null>(null);

interface AppProviderProps {
  children: ReactNode;
  initialState?: Partial<AppState>;
  initialVideoUrl?: string;
}

/**
 * Root state provider that composes all domain providers
 */
export function AppStateProvider({ children, initialState, initialVideoUrl = '' }: AppProviderProps) {
  // Compose providers in the correct dependency order, matching original AppProviders
  return (
    <AuthSessionProvider>
      <AuthProvider>
        <SessionProvider>
          <TimelineProvider>
            <AnnotationProvider>
              <MediaProvider>
                {children}
              </MediaProvider>
            </AnnotationProvider>
          </TimelineProvider>
        </SessionProvider>
      </AuthProvider>
    </AuthSessionProvider>
  );
}

/**
 * This hook will be used for accessing the global app state.
 * Each domain will provide its own more specific hooks.
 */
export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === null) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}