'use client';

import { ReactNode } from 'react';
import { AppStateProvider } from '@/state/store';
import { Navbar } from './Navbar';

interface AppWrapperProps {
  children: ReactNode;
  initialVideoUrl?: string;
}

/**
 * AppWrapper provides a consistent layout with navbar and ensures
 * all components are wrapped in the state provider
 */
export function AppWrapper({ children, initialVideoUrl = '' }: AppWrapperProps) {
  return (
    <AppStateProvider initialVideoUrl={initialVideoUrl}>
      <Navbar />
      <main className="container mx-auto p-4 max-w-7xl">
        {children}
      </main>
    </AppStateProvider>
  );
}