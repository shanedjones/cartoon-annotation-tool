'use client';

/**
 * This file is a placeholder for the removed compatibility layer.
 * 
 * The compatibility layer for window globals has been completely removed
 * as part of the full migration to the new state management system.
 * 
 * This file remains as documentation and to prevent import errors,
 * but it no longer contains any actual functionality.
 */

import React, { Fragment } from 'react';

/**
 * Empty provider that does nothing - for backward compatibility
 */
export function GlobalCompatibilityProvider({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}