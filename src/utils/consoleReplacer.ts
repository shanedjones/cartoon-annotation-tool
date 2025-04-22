/**
 * Utility to replace console.log with the centralized logger
 * This should be imported and initialized early in the application lifecycle
 */

import { logger } from './logger';

interface ConsoleReplacerOptions {
  replaceDebug?: boolean;
  replaceInfo?: boolean;
  replaceWarn?: boolean;
  replaceError?: boolean;
  preserveNativeConsole?: boolean;
}

/**
 * Original console methods
 */
const originalConsole = {
  debug: console.debug,
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

/**
 * Replace console methods with logger
 */
export function replaceConsoleWithLogger(options: ConsoleReplacerOptions = {}): void {
  const {
    replaceDebug = true,
    replaceInfo = true,
    replaceWarn = true,
    replaceError = true,
    preserveNativeConsole = true,
  } = options;

  // If we're in a production environment, force replace all console methods
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Replace console.debug and console.log with logger.debug
  if (replaceDebug || isProduction) {
    console.debug = (...args: any[]) => {
      const message = formatLogArgs(args);
      logger.debug(message, { originalArgs: args });
      
      // Optionally preserve the native console for development
      if (preserveNativeConsole && !isProduction) {
        originalConsole.debug(...args);
      }
    };
    
    console.log = (...args: any[]) => {
      const message = formatLogArgs(args);
      logger.debug(message, { originalArgs: args });
      
      if (preserveNativeConsole && !isProduction) {
        originalConsole.log(...args);
      }
    };
  }
  
  // Replace console.info with logger.info
  if (replaceInfo || isProduction) {
    console.info = (...args: any[]) => {
      const message = formatLogArgs(args);
      logger.info(message, { originalArgs: args });
      
      if (preserveNativeConsole && !isProduction) {
        originalConsole.info(...args);
      }
    };
  }
  
  // Replace console.warn with logger.warn
  if (replaceWarn || isProduction) {
    console.warn = (...args: any[]) => {
      const message = formatLogArgs(args);
      logger.warn(message, { originalArgs: args });
      
      if (preserveNativeConsole && !isProduction) {
        originalConsole.warn(...args);
      }
    };
  }
  
  // Replace console.error with logger.error
  if (replaceError || isProduction) {
    console.error = (...args: any[]) => {
      const message = formatLogArgs(args);
      
      // Check if any arg is an Error object
      const errorArg = args.find(arg => arg instanceof Error);
      
      if (errorArg instanceof Error) {
        logger.error(message, errorArg, { originalArgs: args });
      } else {
        logger.error(message, undefined, { originalArgs: args });
      }
      
      if (preserveNativeConsole && !isProduction) {
        originalConsole.error(...args);
      }
    };
  }
}

/**
 * Restore original console methods
 */
export function restoreConsole(): void {
  console.debug = originalConsole.debug;
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

/**
 * Format console arguments into a string message
 */
function formatLogArgs(args: any[]): string {
  return args
    .map(arg => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (arg instanceof Error) {
        return arg.message;
      }
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    })
    .join(' ');
}