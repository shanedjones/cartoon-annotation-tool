'use client';

import { createVideoContext } from './factory/videoFactory';

// Create the context using the factory
const { 
  Provider: VideoProvider, 
  useVideo, 
  useVideoControls, 
  useVideoDimensions, 
  useVideoSource 
} = createVideoContext();

// Export the components and hooks
export { 
  VideoProvider, 
  useVideo, 
  useVideoControls, 
  useVideoDimensions, 
  useVideoSource 
};