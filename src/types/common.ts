export interface Point {
  x: number;
  y: number;
}
export type EntityId = string;
export type Timestamp = number;
export type Duration = number;
export type TimelinePosition = number;
export type VideoPosition = number;
export type Color = string;
export type StrokeWidth = number;
export interface Dimensions {
  width: number;
  height: number;
}
export type Dictionary<T> = Record<string, T>;
export type CategoryRatings = Dictionary<number | null>;