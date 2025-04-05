/**
 * Common type definitions used across multiple components
 */

/**
 * Represents a 2D point with x,y coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents a unique identifier for various entities
 */
export type EntityId = string;

/**
 * Represents a timestamp in milliseconds since epoch
 */
export type Timestamp = number;

/**
 * Represents a duration in milliseconds
 */
export type Duration = number;

/**
 * Represents a time in the global timeline in milliseconds
 */
export type TimelinePosition = number;

/**
 * Represents a time in the video in milliseconds
 */
export type VideoPosition = number;

/**
 * Represents an RGB color in string format (e.g. "#ff0000")
 */
export type Color = string;

/**
 * Represents the drawing tool width in pixels
 */
export type StrokeWidth = number;

/**
 * Represents the aspect ratio calculation for the video and canvas
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Basic key-value mapping with string keys
 */
export type Dictionary<T> = Record<string, T>;

/**
 * Categories and ratings mapping
 */
export type CategoryRatings = Dictionary<number | null>;