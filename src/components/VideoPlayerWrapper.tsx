'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { v4 as uuidv4 } from 'uuid';
import type { RecordedAction, FeedbackData } from './VideoPlayer';
import type { DrawingPath } from './AnnotationCanvas';
import AudioRecorder from './AudioRecorder';
import FeedbackOrchestrator, { FeedbackSession, AudioTrack, TimelineEvent } from './FeedbackOrchestrator';
import { AppProviders } from '../contexts/AppProviders';
import { useVideoSource, useVideo } from '../contexts/VideoContext';

// Import the AudioChunk type from the AudioRecorder component
import type { AudioChunk } from './AudioRecorder';

// Dynamically import the VideoPlayer with no SSR
const VideoPlayer = dynamic(() => import('./VideoPlayer'), { ssr: false });

// Helper function to convert Blob to base64 for storage
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Format category name from camelCase to readable format
const getCategoryLabel = (category: string): string => {
  return category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
};

// Enhanced helper function to convert base64 back to Blob for playback
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  try {
    // Validate input parameters
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Invalid base64 input: not a string or empty');
    }
    
    if (!mimeType || typeof mimeType !== 'string') {
      mimeType = 'audio/webm'; // Fallback to default
    }
    
    // First ensure we have a proper data URL with the correct format
    if (!base64.startsWith('data:')) {
      throw new Error('Invalid base64 string format - missing data: prefix');
    }
    
    if (!base64.includes(',')) {
      throw new Error('Invalid base64 string format - missing comma separator');
    }
    
    // Extract the base64 part after the comma
    const base64Data = base64.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 string - no data after comma');
    }
    
    // Get actual MIME type from the data URL if present
    const headerPart = base64.split(',')[0];
    const mimeMatch = headerPart.match(/^data:(.*?)(;base64)?$/);
    if (mimeMatch && mimeMatch[1]) {
      // If the data URL contains a MIME type, use it instead of the provided mimeType
      mimeType = mimeMatch[1];
    }
    
    try {
      // Decode the base64 string to binary with error handling
      const byteString = atob(base64Data);
      
      // Create an ArrayBuffer to hold the decoded data
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      // Copy the decoded binary data to the array buffer
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      // Create and return a new Blob from the array buffer
      const blob = new Blob([ab], { type: mimeType });
      
      // Validate created blob
      if (blob.size === 0) {
      } else {
      }
      
      return blob;
    } catch (binaryError) {
      throw new Error(`Failed to process binary data: ${binaryError instanceof Error ? binaryError.message : String(binaryError)}`);
    }
  } catch (error) {
    throw error;
  }
};

// Helper function to prepare audio chunks for saving to JSON
const prepareAudioChunksForSave = async (chunks: AudioChunk[]): Promise<any[]> => {
  if (!chunks || chunks.length === 0) {
    return [];
  }
  
  
  // Create a deep copy of the chunks
  return Promise.all(chunks.map(async (chunk, index) => {
    try {
      console.log(`Processing chunk ${index} for save, blob type:`, 
        chunk.blob instanceof Blob ? 'Blob object' : typeof chunk.blob);
      
      // Only convert if it's a Blob and not already a string
      if (chunk.blob instanceof Blob) {
        
        
        // Convert Blob to base64 string for storage
        const base64 = await blobToBase64(chunk.blob);
        
        // Log length of base64 string for debugging
        
        
        // Save with MIME type and other properties
        return {
          ...chunk,
          blob: base64, // Replace Blob with base64 string
          mimeType: chunk.mimeType || chunk.blob.type, // Ensure we save the mime type
          url: undefined, // Remove URL property if it exists
          blobUrl: chunk.blobUrl // Keep the Azure Storage blob URL if it exists
        };
      } else if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
        // Already a data URL, verify it's properly formatted
        
        
        // Verify data URL format
        const parts = chunk.blob.split(',');
        if (parts.length !== 2) {
          
        }
        
        // Return as is, but ensure all properties are set
        return {
          ...chunk,
          mimeType: chunk.mimeType || 'audio/webm', // Ensure MIME type is set
          url: undefined, // Remove URL property if it exists
          blobUrl: chunk.blobUrl // Keep the Azure Storage blob URL if it exists
        };
      } else {
        
        
        // Return with minimal valid properties
        return {
          ...chunk,
          blob: typeof chunk.blob === 'string' ? chunk.blob : '', // Keep string or use empty string
          mimeType: chunk.mimeType || 'audio/webm', // Ensure MIME type is set
          url: undefined, // Remove URL property if it exists
          blobUrl: chunk.blobUrl // Keep the Azure Storage blob URL if it exists
        };
      }
    } catch (error) {
      
      return null;
    }
  })).then(results => {
    const validResults = results.filter(Boolean); // Remove any failed conversions
    
    return validResults;
  });
};

// Helper function to restore audio chunks when loading saved data
const restoreAudioChunks = (savedChunks: any[]): AudioChunk[] => {
  if (!savedChunks || savedChunks.length === 0) {
    
    return [];
  }
  
  
  
  return savedChunks.map((savedChunk, index) => {
    try {
      // If blob is already a Blob object, just return the chunk as is
      if (savedChunk.blob instanceof Blob) {
        
        return savedChunk;
      }
      
      // If blob is a string (data URL), validate and keep as a string for compatibility
      if (typeof savedChunk.blob === 'string') {
        if (savedChunk.blob.startsWith('data:')) {
          
          
          // Try to validate the data URL format
          try {
            const dataUrlParts = savedChunk.blob.split(',');
            if (dataUrlParts.length !== 2) {
              
            }
            // Check if the mime type part is valid
            const mimeMatch = dataUrlParts[0].match(/:(.*?);/);
            if (!mimeMatch) {
              
            }
          } catch (validationError) {
            
          }
          
          // Ensure all required properties are present
          return {
            ...savedChunk,
            blob: savedChunk.blob, // Keep the data URL as is
            mimeType: savedChunk.mimeType || 'audio/webm', // Set default MIME type if missing
            startTime: savedChunk.startTime || 0,
            duration: savedChunk.duration || 0,
            videoTime: savedChunk.videoTime || 0,
            blobUrl: savedChunk.blobUrl // Keep the Azure Storage blob URL if it exists
          };
        } else {
          
        }
      }
      
      
      if (typeof savedChunk.blob === 'string') {
              } else if (savedChunk.blob === null) {
        
      } else if (savedChunk.blob === undefined) {
        
      }
      
      // Return a simplified chunk as a fallback (audio won't play but won't crash either)
      return {
        ...savedChunk,
        blob: savedChunk.blob || '', // Keep as is even if invalid
        mimeType: savedChunk.mimeType || 'audio/webm',
        startTime: savedChunk.startTime || 0,
        duration: savedChunk.duration || 0,
        videoTime: savedChunk.videoTime || 0,
        blobUrl: savedChunk.blobUrl // Keep the Azure Storage blob URL if it exists
      };
    } catch (error) {
      
      return null;
    }
  }).filter(Boolean as any); // Remove any failed conversions
};

// Convert the legacy FeedbackData to the new FeedbackSession format
const convertLegacyDataToSession = (legacyData: FeedbackData): FeedbackSession => {
  // Create a new FeedbackSession from the legacy data
  const audioTrack: AudioTrack = {
    chunks: legacyData.audioChunks || [],
    totalDuration: legacyData.audioChunks?.reduce((total, chunk) => total + chunk.duration, 0) || 0
  };
  
  // Convert actions to timeline events
  const events: TimelineEvent[] = legacyData.actions.map(action => {
    return {
      id: uuidv4(),
      type: action.type === 'annotation' ? 'annotation' : 'video',
      timeOffset: action.timestamp,
      duration: action.type === 'audio' ? action.details?.duration : undefined,
      payload: 
        action.type === 'annotation' 
          ? { action: action.details?.clear ? 'clear' : 'draw', path: action.details?.path } 
          : { action: action.type, ...action.details }
    };
  });
  
  return {
    id: legacyData.sessionId || uuidv4(),
    videoId: legacyData.videoId,
    startTime: legacyData.startTime,
    endTime: legacyData.endTime,
    audioTrack,
    events
  };
};

// Convert FeedbackSession to legacy FeedbackData format for compatibility
const convertSessionToLegacyData = (session: FeedbackSession): FeedbackData => {
  // Create a new FeedbackData object
  const legacyData: FeedbackData = {
    sessionId: session.id,
    videoId: session.videoId,
    startTime: session.startTime,
    endTime: session.endTime,
    actions: [],
    audioChunks: session.audioTrack.chunks,
    annotations: []
  };
  
  // Collect all annotation paths
  const annotations: DrawingPath[] = [];
  
  // Convert timeline events to legacy actions
  session.events.forEach(event => {
    if (event.type === 'video') {
      const action: RecordedAction = {
        type: event.payload.action,
        timestamp: event.timeOffset,
        videoTime: 0, // Will need proper conversion
        details: { ...event.payload }
      };
      
      if (action.details) {
        delete action.details.action;
      }
      legacyData.actions.push(action);
    } 
    else if (event.type === 'annotation') {
      const action: RecordedAction = {
        type: 'annotation',
        timestamp: event.timeOffset,
        videoTime: 0, // Will need proper conversion
        details: event.payload.action === 'clear' 
          ? { clear: true } 
          : { path: event.payload.path }
      };
      legacyData.actions.push(action);
      
      // Also collect annotation paths for backwards compatibility
      if (event.payload.action === 'draw' && event.payload.path) {
        // Add timing metadata to the annotation for proper replay
        const pathWithTiming = {
          ...event.payload.path,
          timeOffset: event.timeOffset,
          globalTimeOffset: event.timeOffset,
          videoTime: event.timeOffset,
          tool: event.payload.path.tool || 'freehand' // Ensure tool type is preserved
        };
        annotations.push(pathWithTiming);
      }
    }
    else if (event.type === 'marker') {
      // Skip markers, as they don't have a direct equivalent in the legacy format
      
    }
  });
  
  // Add annotations
  legacyData.annotations = annotations;
  
  return legacyData;
};

interface VideoPlayerWrapperProps {
  categories?: Record<string, number | null>;
  onCategoriesCleared?: () => void;
  onCategoriesLoaded?: (categories: Record<string, number>) => void;
  onReplayModeChange?: (isReplay: boolean) => void;
  onVideoLoadingChange?: (isLoading: boolean) => void;
  videoUrl?: string;
  videoId?: string;
  contentToReview?: any; // Allow passing the full content object for display
  initialSession?: any; // Allow passing an initial session from Cosmos DB
  onSessionComplete?: (session: FeedbackSession) => void; // Callback when session is complete
}

export default function VideoPlayerWrapper({ 
  categories = {}, 
  onCategoriesCleared,
  onCategoriesLoaded,
  onReplayModeChange,
  onVideoLoadingChange,
  videoUrl,
  videoId = 'sample-video',
  contentToReview,
  initialSession,
  onSessionComplete
}: VideoPlayerWrapperProps) {
  // Wrap in try/catch in case we're not in a provider
  let videoContext;
  try {
    videoContext = useVideo();
  } catch (error) {
    
    videoContext = { setVideoUrl: () => {}, state: {} };
  }
  
  // Track previous URL to prevent unnecessary context updates
  const prevUrlRef = useRef(videoUrl);
  
  // Set video URL in context only when videoUrl prop changes
  useEffect(() => {
    // Only update if URL actually changed to prevent infinite loops
    if (videoUrl && videoUrl !== prevUrlRef.current) {
        
      // Update URL in context
      videoContext.setVideoUrl(videoUrl);
      prevUrlRef.current = videoUrl;
    }
  }, [videoUrl]);
  const [mode, setMode] = useState<'record' | 'replay'>('record');
  const [isActive, setIsActive] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<FeedbackSession | null>(initialSession || null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    sessionId: '',
    videoId: videoId,
    actions: [],
    startTime: 0,
    annotations: [],
    audioChunks: [],
  });
  
  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Create a properly typed ref for the FeedbackOrchestrator
  const orchestratorVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<any>(null);
  const annotationCanvasComponentRef = useRef<any>(null);
  
  // Function to set the video reference from the child component
  const setVideoElementRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    // Also update the orchestrator video ref when we get a valid element
    if (el) {
      orchestratorVideoRef.current = el;
    }
  }, []);
  
  // Start recording
  const startRecording = useCallback(() => {
    setMode('record');
    
    // Clear any existing annotations before starting
    if (annotationCanvasComponentRef.current) {
      if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
        annotationCanvasComponentRef.current.clearCanvasDrawings();
      }
    }
    
    // Reset video to beginning if needed
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    
    if (orchestratorRef.current) {
      orchestratorRef.current.startRecordingSession();
      setIsActive(true);
    }
  }, []);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (orchestratorRef.current) {
      
      
      // End recording session
      orchestratorRef.current.endRecordingSession();
      setIsActive(false);
      
      // Reset video to beginning
      if (videoRef.current) {
        
        videoRef.current.currentTime = 0;
        
        // If it's playing, pause it
        if (!videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
      
      // Clear annotations
      if (annotationCanvasComponentRef.current) {
        
        if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
          annotationCanvasComponentRef.current.clearCanvasDrawings();
        }
      }
      
      // Call the onCategoriesCleared callback if it exists
      if (onCategoriesCleared) {
        onCategoriesCleared();
      }
      
      // Make sure session availability is updated immediately
      if (typeof window !== 'undefined') {
        window.__hasRecordedSession = true;
        
        
        // Dispatch a custom event to notify about session availability
        window.dispatchEvent(new Event('session-available'));
      }
    }
  }, [onCategoriesCleared, currentSession]);
  
  // Start replaying the recorded session with optimized state changes
  const startReplay = useCallback(() => {
    // Prepare everything before changing state
    // This prevents multiple re-renders
    
    // Prepare canvas
    if (annotationCanvasComponentRef.current && annotationCanvasComponentRef.current.clearCanvasDrawings) {
      
      annotationCanvasComponentRef.current.clearCanvasDrawings();
    }
    
    // Prepare video if available
    if (videoRef.current) {
      
      videoRef.current.currentTime = 0;
    }
    
    if (orchestratorRef.current && currentSession) {
      // First, handle categories clearing if needed
      if (onCategoriesCleared) {
        
        onCategoriesCleared();
      }
      
      
      
      // Load the session if needed
      if (typeof window !== 'undefined' && !window.__sessionReady) {
        
        orchestratorRef.current.loadSession(currentSession);
      }
      
      // Now batch the state updates to reduce re-renders
      try {
        // Batch state updates together to minimize renders
        
        setMode('replay');
        setIsActive(true);
        
        // Use setTimeout to ensure state updates have completed
        // before starting the replay, which prevents race conditions
        setTimeout(() => {
          if (orchestratorRef.current) {
            
            orchestratorRef.current.startReplay();
            
            // Set the completed review status if needed
            if (typeof window !== 'undefined' && window.__isCompletedVideo) {
              
            }
          }
        }, 0);
      } catch (error) {
        
      }
    } else {
      alert('No recorded session to replay. Record a session first.');
    }
  }, [currentSession, onCategoriesCleared]);
  
  // Stop replay and reset to initial state
  const stopReplay = useCallback(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.stopReplay();
      setIsActive(false);
      
      // Reset mode back to empty to return to initial state
      setMode('');
      
      // Notify parent that replay is no longer active
      if (onReplayModeChange) {
        onReplayModeChange(false);
      }
      
      // Reset video to beginning
      if (videoRef.current) {
        
        videoRef.current.currentTime = 0;
        
        // If it's playing, pause it
        if (!videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
      
      // Clear annotations
      if (annotationCanvasComponentRef.current) {
        
        if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
          annotationCanvasComponentRef.current.clearCanvasDrawings();
        }
      }
      
      // Set window state to reflect the replay has ended
      if (typeof window !== 'undefined') {
        window.__isReplaying = false;
      }
    }
  }, [onReplayModeChange]);
  
  // Handle session completion
  const handleSessionComplete = useCallback((session: FeedbackSession) => {
    // First create a deep copy of the session to avoid any referential issues
    const sessionCopy = JSON.parse(JSON.stringify(session));
    
    // Deep copy the categories to ensure they're not references
    const categoriesCopy = JSON.parse(JSON.stringify(categories));
    
    // Log the actual values we're trying to save
    
    
    // Log which categories are true (selected)
    const selectedCategories = Object.entries(categoriesCopy)
      .filter(([_, value]) => value)
      .map(([key]) => key);
    
    
    // Add the categories to the session
    const sessionWithCategories = {
      ...sessionCopy,
      categories: categoriesCopy
    };
    
    setCurrentSession(sessionWithCategories);
    
    // Also update legacy feedbackData for compatibility
    const legacyData = convertSessionToLegacyData(sessionWithCategories);
    setFeedbackData(legacyData);
    
    // Update session availability flag immediately
    if (typeof window !== 'undefined') {
      window.__hasRecordedSession = true;
      
      
      // Dispatch a custom event to notify about session availability
      window.dispatchEvent(new Event('session-available'));
    }
    
    
    
    // Call the parent's onSessionComplete callback if provided
    if (onSessionComplete) {
      onSessionComplete(sessionWithCategories);
    }
  }, [categories, onSessionComplete]);
  
  // Handle audio recording completed
  const handleAudioRecorded = useCallback((audioTrack: AudioTrack) => {
    
  }, []);
  
  // Draw annotation
  const drawAnnotation = useCallback((path: DrawingPath) => {
    // Only update the video time if it's not already set (for new annotations, not replayed ones)
    if (videoRef.current && !path.videoTime) {
      path.videoTime = videoRef.current.currentTime * 1000;
      
      
    }
    
    // Pass annotation to the annotation canvas component via the VideoPlayer
    if (annotationCanvasComponentRef.current) {
      
      try {
        // Use the handleManualAnnotation method exposed by the AnnotationCanvas
        annotationCanvasComponentRef.current.handleManualAnnotation(path);
      } catch (error) {
        
      }
    } else {
      
    }
  }, []);
  
  // Clear annotations
  const clearAnnotations = useCallback(() => {
    if (annotationCanvasComponentRef.current) {
      
      
      try {
        // Use the clearCanvasDrawings method exposed by the AnnotationCanvas
        if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
          annotationCanvasComponentRef.current.clearCanvasDrawings();
        } else {
          
        }
      } catch (error) {
        
      }
    } else {
      
    }
  }, []);
  
  // Download session data as JSON
  const downloadSessionData = useCallback(async () => {
    if (!currentSession) {
      alert('No recorded session to download.');
      return;
    }
    
    try {
      // Create a deep copy to avoid modifying the original state
      const sessionCopy = JSON.parse(JSON.stringify(currentSession));
      
      // Ensure categories are included in the download
      
      
      // Deep copy the categories to ensure they're not references
      const categoriesCopy = JSON.parse(JSON.stringify(categories));
      
      // Log which categories are currently selected
      const selectedCategories = Object.entries(categoriesCopy)
        .filter(([_, value]) => value)
        .map(([key]) => key);
      
      
      // Make sure we have the latest categories
      sessionCopy.categories = categoriesCopy;
      
      
      // Prepare audio chunks for serialization
      if (sessionCopy.audioTrack && sessionCopy.audioTrack.chunks.length > 0) {
        try {
          
          sessionCopy.audioTrack.chunks = await prepareAudioChunksForSave(sessionCopy.audioTrack.chunks);
          
        } catch (error) {
          
          alert('There was an issue preparing audio data for download. Some audio content may be missing.');
        }
      }
      
      const dataStr = JSON.stringify(sessionCopy, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `feedback-session-${currentSession.id}.json`);
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
    } catch (error) {
      
      alert('Failed to download session data. See console for details.');
    }
  }, [currentSession, categories]);
  
  // Handle file upload for previously saved session data
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        // Parse the JSON data
        const jsonData = JSON.parse(event.target?.result as string);
        
        // Check if it's the new format or legacy format
        if (jsonData.events && jsonData.audioTrack) {
          // It's the new FeedbackSession format
          const loadedSession = jsonData as FeedbackSession;
          
          // Log if we have categories
          
          
          // Restore audio chunks with proper Blob objects if they exist
          if (loadedSession.audioTrack && loadedSession.audioTrack.chunks) {
            loadedSession.audioTrack.chunks = restoreAudioChunks(loadedSession.audioTrack.chunks);
          }
          
          setCurrentSession(loadedSession);
          // Also update legacy format for compatibility
          setFeedbackData(convertSessionToLegacyData(loadedSession));
          
          
        } else {
          // It's the legacy FeedbackData format
          const legacyData = jsonData as FeedbackData;
          
          // Restore audio chunks
          if (legacyData.audioChunks) {
            legacyData.audioChunks = restoreAudioChunks(legacyData.audioChunks);
          }
          
          setFeedbackData(legacyData);
          // Convert to new format
          const newSession = convertLegacyDataToSession(legacyData);
          setCurrentSession(newSession);
          
          
        }
      } catch (error) {
        
        alert("Invalid feedback data file. Please upload a valid JSON file.");
      }
    };
    
    reader.onerror = (error) => {
      
      alert('Error reading the file. Please try again.');
    };
    
    reader.readAsText(file);
  }, []);
  
  // Get an orchestrator reference
  const getOrchestratorRef = useCallback((orchestratorInstance: any) => {
    orchestratorRef.current = orchestratorInstance;
  }, []);
  
  // Method to record a category change
  const recordCategoryChange = useCallback((category: string, rating: number) => {
    if (orchestratorRef.current) {
      
      
      // Check if recording is active - if not, initiate a minimal session if needed
      if (!isActive && mode === 'record') {
        
        // If we don't have a current session, create a simple one for storing categories
        if (!currentSession) {
          
          const newSession = {
            id: `temp-${Date.now()}`,
            videoId: videoId || 'unknown',
            startTime: Date.now(),
            events: [],
            audioTrack: { chunks: [], totalDuration: 0 },
            categories: { [category]: rating }
          };
          setCurrentSession(newSession);
        }
      }
      
      // Always store category changes, even if not actively recording
      orchestratorRef.current.handleCategoryEvent(category, rating);
    } else {
      
    }
  }, [mode, isActive, currentSession, videoId]);
  
  // Get a reference to the annotation canvas via the video player
  const getVideoPlayerRef = useCallback((videoPlayerInstance: any) => {
    // Store the video player reference
    annotationCanvasComponentRef.current = videoPlayerInstance?.annotationCanvas;
    
  }, []);
  
  // Listen for replay progress to detect completion
  useEffect(() => {
    if (orchestratorRef.current && mode === 'replay' && isActive) {
      // Check if orchestrator has a replayProgress property
      const progress = orchestratorRef.current.replayProgress;
      if (progress === 100) {
        // Replay has completed, reset the UI state
        
        setIsActive(false);
        
        // Reset video to beginning
        if (videoRef.current) {
          
          videoRef.current.currentTime = 0;
          
          // If it's playing, pause it
          if (!videoRef.current.paused) {
            videoRef.current.pause();
          }
        }
        
        // Clear annotations
        if (annotationCanvasComponentRef.current) {
          
          if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
            annotationCanvasComponentRef.current.clearCanvasDrawings();
          }
        }
      }
    }
  }, [mode, isActive, orchestratorRef.current?.replayProgress]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (orchestratorRef.current && isActive) {
        if (mode === 'record') {
          orchestratorRef.current.endRecordingSession();
        } else {
          orchestratorRef.current.stopReplay();
        }
      }
    };
  }, [isActive, mode]);

  // Using the Window interface defined in src/types/global.d.ts
  
  // Expose methods to the parent component and notify about mode changes
  useEffect(() => {
    // This runs once when the component mounts and when dependencies change
    if (typeof window !== 'undefined') {
      // Set global reference available to parent component
      window.__videoPlayerWrapper = {
        recordCategoryChange,
        isRecording: mode === 'record' && isActive,
        startReplay,
        stopReplay,
        resetState: () => {
          // Reset state to initial condition after replay
          setMode('');
          setIsActive(false);
          if (onReplayModeChange) {
            onReplayModeChange(false);
          }
          if (typeof window !== 'undefined') {
            window.__isReplaying = false;
          }
        }
      };
      
      // Update session availability flag
      window.__hasRecordedSession = currentSession !== null;
    }
    
    // Notify parent component about replay mode changes
    if (onReplayModeChange) {
      const isReplay = mode === 'replay';
      
      onReplayModeChange(isReplay);
    }
    
    return () => {
      // Clean up on unmount
      if (typeof window !== 'undefined' && window.__videoPlayerWrapper) {
        delete window.__videoPlayerWrapper;
      }
    };
  }, [recordCategoryChange, mode, isActive, onReplayModeChange, currentSession]);
  
  // Load session but only start replay if not a completed video
  useEffect(() => {
    if (initialSession && !isActive && mode === 'record') {
      
      
      // Set a small delay to ensure everything is properly initialized
      setTimeout(() => {
        if (orchestratorRef.current) {
          // Set the current session
          setCurrentSession(initialSession);
          
          // Load the session without auto-starting replay or switching mode yet
          orchestratorRef.current.loadSession(initialSession);
          
          // Check if this is a new session or a completed video
          if (typeof window !== 'undefined' && !window.__isCompletedVideo) {
            
            // For new reviews, we auto-start and switch to replay mode
            setMode('replay');
            orchestratorRef.current.startReplay();
            setIsActive(true);
          } else {
            
            // For completed videos, just set ready flag but don't change mode yet
            if (typeof window !== 'undefined') {
              window.__sessionReady = true;
              // Dispatch event to notify UI
              window.dispatchEvent(new Event('session-ready'));
            }
          }
        }
      }, 1500);
    }
  }, [initialSession]);
  
  // Get the effective URL from the context with fallback
  let contextVideoUrl;
  try {
    const videoSource = useVideoSource();
    contextVideoUrl = videoSource?.effectiveUrl;
  } catch (error) {
    
    contextVideoUrl = videoUrl; // Fallback to prop
  }
  
  // Log when the effective URL changes
  useEffect(() => {
    
  }, [contextVideoUrl]);
  
  return (
    <div className="w-full">
        {/* Hidden buttons that will be triggered by parent */}
        <div className="hidden">
          <button
            id="startRecordingButton"
            onClick={startRecording}
          >
            Start Recording
          </button>
          
          <button
            id="startReplayButton"
            onClick={startReplay}
            disabled={!currentSession}
          >
            Replay Session
          </button>
          
          <button
            id="downloadDataButton"
            onClick={downloadSessionData}
            disabled={!currentSession}
          >
            Download Data
          </button>
          
          <label>
            <input 
              id="fileUploadInput"
              type="file" 
              accept=".json" 
              onChange={handleFileUpload} 
            />
            Load Data
          </label>
          
          <button
            id="stopButton"
            onClick={mode === 'record' ? stopRecording : stopReplay}
          >
            Stop
          </button>
        </div>
        
        
        {/* Feedback Orchestrator handles all coordination */}
        <div className="relative">
          <VideoPlayer 
            ref={getVideoPlayerRef}
            isRecording={mode === 'record' && isActive}
            isReplaying={mode === 'replay' && isActive}
            setVideoRef={setVideoElementRef}
            replayAnnotations={currentSession?.events
              ?.filter(e => e.type === 'annotation' && e.payload?.action === 'draw' && e.payload?.path)
              ?.map(e => {
                // Make sure the tool property is preserved during replay
                const tool = e.payload.path.tool || 'freehand';
                
                
                return {
                  ...e.payload.path,
                  timeOffset: e.timeOffset,
                  globalTimeOffset: e.timeOffset,
                  videoTime: e.timeOffset,
                  tool: tool  // Explicitly set the tool to ensure it's included
                };
              }) || feedbackData.annotations || []}
            videoUrl={videoUrl}
            onLoadingStateChange={(isLoading) => {
              
              setIsVideoLoading(isLoading);
              if (onVideoLoadingChange) {
                onVideoLoadingChange(isLoading);
              }
            }}
            onRecordAction={(action) => {
              // Forward video actions to the orchestrator
              if (orchestratorRef.current && mode === 'record' && isActive) {
                switch(action.type) {
                  case 'play':
                  case 'pause':
                  case 'seek':
                  case 'playbackRate':
                  case 'keyboardShortcut':
                    orchestratorRef.current.handleVideoEvent(action.type, action.details);
                    break;
                  case 'annotation':
                    if (action.details?.clear) {
                      orchestratorRef.current.handleAnnotationEvent('clear');
                    } else if (action.details?.path) {
                      orchestratorRef.current.handleAnnotationEvent('draw', action.details.path);
                    }
                    break;
                }
              }
            }}
            onAnnotationAdded={(annotation) => {
              // Forward annotation events to the orchestrator
              if (orchestratorRef.current && mode === 'record' && isActive) {
                orchestratorRef.current.handleAnnotationEvent('draw', annotation);
              }
            }}
            isCompletedVideo={typeof window !== 'undefined' && window.__isCompletedVideo === true}
            hasRecordedSession={typeof window !== 'undefined' && window.__hasRecordedSession === true}
          />
          
          {/* Initialize the Orchestrator */}
          <FeedbackOrchestrator
          videoElementRef={orchestratorVideoRef}
          canvasRef={canvasRef}
          drawAnnotation={drawAnnotation}
          clearAnnotations={clearAnnotations}
          onAudioRecorded={handleAudioRecorded}
          onSessionComplete={handleSessionComplete}
          initialSession={currentSession}
          mode={mode}
          onCategoriesLoaded={(loadedCategories) => {
            // When a session is loaded with categories, we need to notify the parent component
            if (loadedCategories) {
              
              
              // First clear existing categories
              if (onCategoriesCleared) {
                
                onCategoriesCleared();
              }
              
              // Check if we have any true categories
              const hasCheckedCategories = Object.values(loadedCategories).some(isChecked => isChecked);
              
              
              // Then load the saved categories using the callback if available
              if (hasCheckedCategories && onCategoriesLoaded) {
                
                
                // Delay slightly to ensure UI state is updated properly after clearing
                setTimeout(() => {
                  // Convert boolean values to numbers (1 for true, 0 for false)
                  const numberCategories: Record<string, number> = {};
                  Object.entries(loadedCategories).forEach(([key, value]) => {
                    numberCategories[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value as number;
                  });
                  onCategoriesLoaded(numberCategories);
                }, 100);
              } else {
                
              }
            } else {
              
            }
          }}
          ref={getOrchestratorRef}
        />
      </div>
      
      {currentSession && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Recorded Session</h3>
          <div className="text-sm">
            <p><strong>Session ID:</strong> {currentSession.id}</p>
            <p><strong>Start Time:</strong> {new Date(currentSession.startTime).toLocaleString()}</p>
            <p><strong>Events:</strong> {currentSession.events.length} recorded actions</p>
            <p><strong>Audio Duration:</strong> {(currentSession.audioTrack.totalDuration / 1000).toFixed(2)}s</p>
            
            {currentSession.categories && Object.keys(currentSession.categories).length > 0 && (
              <div className="mt-2">
                <p><strong>Category Ratings:</strong></p>
                <ul className="list-none space-y-2">
                  {Object.entries(currentSession.categories)
                    .filter(([_, rating]) => rating !== null && (typeof rating === 'boolean' ? rating : rating > 0))
                    .map(([category, rating]) => (
                      <li key={category}>
                        <div>
                          {category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                        </div>
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const ratingValue = rating as number;
                            
                            // Display colored indicator based on the rating value
                            switch(ratingValue) {
                              case 1:
                                return <div className="w-6 h-6 rounded-full bg-red-500" title="Red rating" />;
                              case 2:
                                return <div className="w-6 h-6 rounded-full bg-yellow-500" title="Yellow rating" />;
                              case 3:
                                return <div className="w-6 h-6 rounded-full bg-green-500" title="Green rating" />;
                              default:
                                return <div className="w-6 h-6 rounded-full bg-gray-200" title="No rating" />;
                            }
                          })()}
                          <span className="text-sm text-gray-500">
                            {(() => {
                              const ratingValue = rating as number;
                              switch(ratingValue) {
                                case 1: return "Needs work";
                                case 2: return "Acceptable";
                                case 3: return "Good";
                                default: return "Not rated";
                              }
                            })()}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="max-h-48 overflow-y-auto mt-4">
            <h4 className="font-medium text-sm mb-2">Timeline Events:</h4>
            <ul className="text-xs bg-white rounded p-2">
              {currentSession.events.map((event, index) => (
                <li key={index} className="mb-1 p-2 border-b">
                  <span className="font-semibold">{event.type}</span> at{' '}
                  <span className="font-mono">{(event.timeOffset / 1000).toFixed(2)}s</span>
                  {event.type === 'video' && (
                    <span className="block text-gray-600">
                      Action: {event.payload.action}
                      {event.payload.to !== undefined && ` (to: ${event.payload.to})`}
                    </span>
                  )}
                  {event.type === 'annotation' && (
                    <span className="block text-gray-600">
                      {event.payload.action === 'clear' 
                        ? "Cleared annotations" 
                        : `Drew annotation with ${event.payload.path?.points?.length || 0} points`}
                    </span>
                  )}
                  {event.type === 'marker' && (
                    <span className="block text-gray-600">
                      Marker: {event.payload.text}
                    </span>
                  )}
                  {event.type === 'category' && (
                    <span className="block text-gray-600">
                      Category: {getCategoryLabel(event.payload.category)} {event.payload.rating > 0 ? `(rated ${event.payload.rating}★)` : '(cleared)'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}