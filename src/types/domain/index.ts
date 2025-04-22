/**
 * Domain-specific type definitions for the application
 * Providing a central location for all domain model types
 */

// Base entity type
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// User domain
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  preferences?: UserPreferences;
  isActive: boolean;
}

export type UserRole = 'admin' | 'coach' | 'athlete' | 'guest';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}

// Video domain
export interface Video extends BaseEntity {
  title: string;
  description?: string;
  url: string;
  duration: number;
  thumbnail?: string;
  ownerId: string;
  visibility: 'private' | 'team' | 'public';
  tags: string[];
}

// Session domain
export interface Session extends BaseEntity {
  userId: string;
  videoId: string;
  status: SessionStatus;
  annotations: Annotation[];
  audioTrack?: AudioTrack;
  feedback?: string;
  categories?: string[];
  shareableLink?: string;
}

export type SessionStatus = 'draft' | 'active' | 'completed' | 'archived';

// Annotation domain
export interface Annotation extends BaseEntity {
  sessionId: string;
  videoTime: number;
  content: AnnotationContent;
  type: AnnotationType;
  author: string;
}

export type AnnotationType = 'drawing' | 'text' | 'voice' | 'measurement';

export type AnnotationContent = 
  | DrawingAnnotation
  | TextAnnotation
  | VoiceAnnotation
  | MeasurementAnnotation;

export interface DrawingAnnotation {
  type: 'drawing';
  path: Point[];
  color: string;
  width: number;
  timeOffset: number;
}

export interface TextAnnotation {
  type: 'text';
  text: string;
  position: Point;
  color: string;
  fontSize: number;
}

export interface VoiceAnnotation {
  type: 'voice';
  audioUrl: string;
  duration: number;
  transcription?: string;
}

export interface MeasurementAnnotation {
  type: 'measurement';
  points: Point[];
  label: string;
  value: number;
  unit: 'px' | 'cm' | 'deg';
}

export interface Point {
  x: number;
  y: number;
}

// Audio domain
export interface AudioTrack extends BaseEntity {
  sessionId: string;
  url: string;
  duration: number;
  transcription?: string;
  markers: AudioMarker[];
}

export interface AudioMarker {
  id: string;
  time: number;
  label: string;
  type: 'segment' | 'comment' | 'highlight';
}

// Category / Assessment domain
export interface Category extends BaseEntity {
  name: string;
  description?: string;
  subcategories: string[];
  color?: string;
}

export interface Assessment extends BaseEntity {
  sessionId: string;
  categories: CategoryAssessment[];
  overallScore: number;
  comments: string;
}

export interface CategoryAssessment {
  categoryId: string;
  score: number;
  feedback?: string;
}