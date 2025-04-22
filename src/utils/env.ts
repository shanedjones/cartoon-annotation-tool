/**
 * Secure environment variable loading and validation utilities
 */

import { logger } from './logger';

/**
 * Environment configuration interface
 * Defines all required environment variables for the application
 */
export interface EnvConfig {
  // Azure Storage
  AZURE_STORAGE_CONNECTION_STRING: string;
  
  // Cosmos DB
  COSMOS_ENDPOINT: string;
  COSMOS_KEY: string;
  
  // Authentication
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  JWT_SECRET: string;
  
  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_API_URL: string;
  
  // Optional variables with defaults
  LOG_LEVEL?: string;
  SESSION_TIMEOUT_MINUTES?: string;
}

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'AZURE_STORAGE_CONNECTION_STRING',
  'COSMOS_ENDPOINT',
  'COSMOS_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'JWT_SECRET',
] as const;

/**
 * Optional environment variables with default values
 */
const DEFAULT_ENV_VALUES: Partial<Record<keyof EnvConfig, string>> = {
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
  SESSION_TIMEOUT_MINUTES: '30',
};

/**
 * Validate environment variables 
 * Checks that all required variables are present
 * Returns a typed environment config
 */
export function validateEnv(): EnvConfig {
  const missingVars: string[] = [];
  
  // Check for missing required environment variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  // If any required variables are missing, log and throw an error
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  // Apply default values for optional variables
  Object.entries(DEFAULT_ENV_VALUES).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  });
  
  // Special case validations
  if (process.env.NODE_ENV !== 'development' && 
      process.env.NODE_ENV !== 'production' && 
      process.env.NODE_ENV !== 'test') {
    logger.warn(`Invalid NODE_ENV value: ${process.env.NODE_ENV}. Using default: development`);
    process.env.NODE_ENV = 'development';
  }
  
  // Return typed environment config
  return process.env as unknown as EnvConfig;
}

/**
 * Get a specific environment variable with validation
 * Ensures the variable exists and throws an error if it doesn't
 */
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  const value = process.env[key];
  
  if (value === undefined) {
    const errorMessage = `Missing required environment variable: ${key}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  return value as EnvConfig[K];
}

/**
 * Get a specific environment variable with a default value
 */
export function getEnvWithDefault<K extends keyof EnvConfig>(
  key: K, 
  defaultValue: EnvConfig[K]
): EnvConfig[K] {
  const value = process.env[key];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  return value as EnvConfig[K];
}

/**
 * Get a specific environment variable as a number
 */
export function getEnvAsInt(
  key: keyof EnvConfig,
  defaultValue?: number
): number {
  const value = process.env[key];
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    const errorMessage = `Missing required environment variable: ${key}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  const numValue = parseInt(value, 10);
  
  if (isNaN(numValue)) {
    logger.warn(`Environment variable ${key} is not a valid number: ${value}`);
    return defaultValue !== undefined ? defaultValue : 0;
  }
  
  return numValue;
}

/**
 * Get a boolean environment variable
 * 'true', '1', 'yes' are considered true
 * 'false', '0', 'no' are considered false
 */
export function getEnvAsBool(
  key: keyof EnvConfig,
  defaultValue: boolean = false
): boolean {
  const value = process.env[key]?.toLowerCase();
  
  if (value === undefined) {
    return defaultValue;
  }
  
  return ['true', '1', 'yes'].includes(value);
}

/**
 * Validate and load the environment at application startup
 */
export function loadEnv(): EnvConfig {
  try {
    // In development or test, we can load .env files
    if (process.env.NODE_ENV !== 'production') {
      // This would typically be done with dotenv, but Next.js does this automatically
      // require('dotenv').config();
    }
    
    // Validate environment variables
    return validateEnv();
  } catch (error) {
    logger.error('Failed to load environment variables', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}