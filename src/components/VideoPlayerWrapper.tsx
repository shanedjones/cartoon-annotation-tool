'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { v4 as uuidv4 } from 'uuid';
import type { RecordedAction, FeedbackData } from './VideoPlayer';
import type { DrawingPath } from './AnnotationCanvas';
import AudioRecorder from './AudioRecorder';
import FeedbackOrchestrator, { FeedbackSession, AudioTrack, TimelineEvent } from './FeedbackOrchestrator';

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
      console.error('Invalid base64 input: not a string or empty', typeof base64);
      throw new Error('Invalid base64 input: not a string or empty');
    }
    
    if (!mimeType || typeof mimeType !== 'string') {
      console.warn('Invalid or missing MIME type, using default: audio/webm');
      mimeType = 'audio/webm'; // Fallback to default
    }
    
    // First ensure we have a proper data URL with the correct format
    if (!base64.startsWith('data:')) {
      console.error('Invalid base64 string format - missing data: prefix');
      console.debug('String starts with:', base64.substring(0, Math.min(20, base64.length)));
      throw new Error('Invalid base64 string format - missing data: prefix');
    }
    
    if (!base64.includes(',')) {
      console.error('Invalid base64 string format - missing comma separator');
      throw new Error('Invalid base64 string format - missing comma separator');
    }
    
    // Extract the base64 part after the comma
    const base64Data = base64.split(',')[1];
    if (!base64Data) {
      console.error('Invalid base64 string - no data after comma');
      throw new Error('Invalid base64 string - no data after comma');
    }
    
    // Get actual MIME type from the data URL if present
    const headerPart = base64.split(',')[0];
    const mimeMatch = headerPart.match(/^data:(.*?)(;base64)?$/);
    if (mimeMatch && mimeMatch[1]) {
      // If the data URL contains a MIME type, use it instead of the provided mimeType
      console.log(`Using MIME type from data URL (${mimeMatch[1]}) instead of provided type (${mimeType})`);
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
        console.warn('Created an empty blob from base64 data, possible data corruption');
      } else {
        console.log(`Successfully converted base64 to Blob: size=${blob.size}, type=${blob.type}`);
      }
      
      return blob;
    } catch (binaryError) {
      console.error('Error processing binary data:', binaryError);
      throw new Error(`Failed to process binary data: ${binaryError instanceof Error ? binaryError.message : String(binaryError)}`);
    }
  } catch (error) {
    console.error('Error converting base64 to Blob:', error);
    throw error;
  }
};

// Helper function to prepare audio chunks for saving to JSON
const prepareAudioChunksForSave = async (chunks: AudioChunk[]): Promise<any[]> => {
  if (!chunks || chunks.length === 0) {
    console.log('No audio chunks to prepare for save');
    return [];
  }
  
  console.log(`Preparing ${chunks.length} audio chunks for save...`);
  
  // Create a deep copy of the chunks
  return Promise.all(chunks.map(async (chunk, index) => {
    try {
      console.log(`Processing chunk ${index} for save, blob type:`, 
        chunk.blob instanceof Blob ? 'Blob object' : typeof chunk.blob);
      
      // Only convert if it's a Blob and not already a string
      if (chunk.blob instanceof Blob) {
        console.log(`Chunk ${index}: Converting Blob to base64, size: ${chunk.blob.size}, type: ${chunk.blob.type}`);
        
        // Convert Blob to base64 string for storage
        const base64 = await blobToBase64(chunk.blob);
        
        // Log length of base64 string for debugging
        console.log(`Chunk ${index}: Base64 conversion complete, string length: ${base64.length}`);
        
        // Save with MIME type and other properties
        return {
          ...chunk,
          blob: base64, // Replace Blob with base64 string
          mimeType: chunk.mimeType || chunk.blob.type, // Ensure we save the mime type
          url: undefined // Remove URL property if it exists
        };
      } else if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
        // Already a data URL, verify it's properly formatted
        console.log(`Chunk ${index}: Already a data URL, length: ${chunk.blob.length}`);
        
        // Verify data URL format
        const parts = chunk.blob.split(',');
        if (parts.length !== 2) {
          console.warn(`Chunk ${index}: Invalid data URL format - wrong number of parts`);
        }
        
        // Return as is, but ensure all properties are set
        return {
          ...chunk,
          mimeType: chunk.mimeType || 'audio/webm', // Ensure MIME type is set
          url: undefined // Remove URL property if it exists
        };
      } else {
        console.warn(`Chunk ${index}: Unknown blob format: ${typeof chunk.blob}`);
        
        // Return with minimal valid properties
        return {
          ...chunk,
          blob: typeof chunk.blob === 'string' ? chunk.blob : '', // Keep string or use empty string
          mimeType: chunk.mimeType || 'audio/webm', // Ensure MIME type is set
          url: undefined // Remove URL property if it exists
        };
      }
    } catch (error) {
      console.error(`Error converting audio chunk ${index} for storage:`, error);
      return null;
    }
  })).then(results => {
    const validResults = results.filter(Boolean); // Remove any failed conversions
    console.log(`Successfully prepared ${validResults.length} of ${chunks.length} audio chunks for save`);
    return validResults;
  });
};

// Helper function to restore audio chunks when loading saved data
const restoreAudioChunks = (savedChunks: any[]): AudioChunk[] => {
  if (!savedChunks || savedChunks.length === 0) {
    console.log('No audio chunks to restore');
    return [];
  }
  
  console.log(`Restoring ${savedChunks.length} audio chunks...`);
  
  return savedChunks.map((savedChunk, index) => {
    try {
      // If blob is already a Blob object, just return the chunk as is
      if (savedChunk.blob instanceof Blob) {
        console.log(`Chunk ${index}: Already a Blob object`);
        return savedChunk;
      }
      
      // If blob is a string (data URL), validate and keep as a string for compatibility
      if (typeof savedChunk.blob === 'string') {
        if (savedChunk.blob.startsWith('data:')) {
          console.log(`Chunk ${index}: Found data URL, keeping as string for AudioRecorder component`);
          
          // Try to validate the data URL format
          try {
            const dataUrlParts = savedChunk.blob.split(',');
            if (dataUrlParts.length !== 2) {
              console.warn(`Chunk ${index}: Invalid data URL format - wrong number of parts`);
            }
            // Check if the mime type part is valid
            const mimeMatch = dataUrlParts[0].match(/:(.*?);/);
            if (!mimeMatch) {
              console.warn(`Chunk ${index}: Data URL has no valid MIME type`);
            }
          } catch (validationError) {
            console.warn(`Chunk ${index}: Error validating data URL:`, validationError);
          }
          
          // Ensure all required properties are present
          return {
            ...savedChunk,
            blob: savedChunk.blob, // Keep the data URL as is
            mimeType: savedChunk.mimeType || 'audio/webm', // Set default MIME type if missing
            startTime: savedChunk.startTime || 0,
            duration: savedChunk.duration || 0,
            videoTime: savedChunk.videoTime || 0
          };
        } else {
          console.warn(`Chunk ${index}: String blob doesn't start with 'data:' prefix: ${savedChunk.blob.substring(0, 20)}...`);
        }
      }
      
      console.warn(`Unknown blob format in chunk ${index}:`, typeof savedChunk.blob);
      // Log more details to aid debugging
      if (typeof savedChunk.blob === 'string') {
        console.info(`Chunk ${index} string length: ${savedChunk.blob.length}, starts with: ${savedChunk.blob.substring(0, 30)}...`);
      } else if (savedChunk.blob === null) {
        console.warn(`Chunk ${index}: Blob is null`);
      } else if (savedChunk.blob === undefined) {
        console.warn(`Chunk ${index}: Blob is undefined`);
      }
      
      // Return a simplified chunk as a fallback (audio won't play but won't crash either)
      return {
        ...savedChunk,
        blob: savedChunk.blob || '', // Keep as is even if invalid
        mimeType: savedChunk.mimeType || 'audio/webm',
        startTime: savedChunk.startTime || 0,
        duration: savedChunk.duration || 0,
        videoTime: savedChunk.videoTime || 0
      };
    } catch (error) {
      console.error(`Error restoring audio chunk ${index}:`, error);
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
      delete action.details.action;
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
        annotations.push(event.payload.path);
      }
    }
    else if (event.type === 'marker') {
      // Skip markers, as they don't have a direct equivalent in the legacy format
      console.log('Skipping marker event in legacy conversion:', event.payload.text);
    }
  });
  
  // Add annotations
  legacyData.annotations = annotations;
  
  return legacyData;
};

interface VideoPlayerWrapperProps {
  categories?: Record<string, boolean>;
  onCategoriesCleared?: () => void;
  onCategoriesLoaded?: (categories: Record<string, boolean>) => void;
  onReplayModeChange?: (isReplay: boolean) => void;
}

export default function VideoPlayerWrapper({ 
  categories = {}, 
  onCategoriesCleared,
  onCategoriesLoaded,
  onReplayModeChange
}: VideoPlayerWrapperProps) {
  // Log categories passed from parent on every render
  console.log('VideoPlayerWrapper received categories:', categories);
  const [mode, setMode] = useState<'record' | 'replay'>('record');
  const [isActive, setIsActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<FeedbackSession | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    sessionId: '',
    videoId: 'sample-big-buck-bunny',
    actions: [],
    startTime: 0,
    annotations: [],
    audioChunks: [],
  });
  
  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<any>(null);
  const annotationCanvasComponentRef = useRef<any>(null);
  
  // Function to set the video reference from the child component
  const setVideoElementRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
  }, []);
  
  // Start recording
  const startRecording = useCallback(() => {
    setMode('record');
    
    // Clear any existing annotations before starting
    if (annotationCanvasComponentRef.current) {
      console.log('Clearing annotations before starting new recording');
      if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
        annotationCanvasComponentRef.current.clearCanvasDrawings();
      }
    }
    
    // Reset video to beginning if needed
    if (videoRef.current) {
      console.log('Resetting video position before starting recording');
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
        console.log('Resetting video position to start');
        videoRef.current.currentTime = 0;
        
        // If it's playing, pause it
        if (!videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
      
      // Clear annotations
      if (annotationCanvasComponentRef.current) {
        console.log('Clearing annotations after recording stopped');
        if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
          annotationCanvasComponentRef.current.clearCanvasDrawings();
        }
      }
      
      // Call the onCategoriesCleared callback if it exists
      if (onCategoriesCleared) {
        onCategoriesCleared();
      }
    }
  }, [onCategoriesCleared]);
  
  // Start replaying the recorded session
  const startReplay = useCallback(() => {
    setMode('replay');
    
    // Clear any existing annotations before starting replay
    if (annotationCanvasComponentRef.current) {
      console.log('Clearing annotations before starting replay');
      if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
        annotationCanvasComponentRef.current.clearCanvasDrawings();
      }
    }
    
    // Reset video to beginning
    if (videoRef.current) {
      console.log('Resetting video position before starting replay');
      videoRef.current.currentTime = 0;
    }
    
    if (orchestratorRef.current && currentSession) {
      // Clear categories before replay starts
      if (onCategoriesCleared) {
        console.log('Clearing categories before replay');
        onCategoriesCleared();
      }
      
      // Log the categories of the session we're replaying
      console.log('Replaying session with categories:', currentSession.categories);
      
      orchestratorRef.current.loadSession(currentSession);
      orchestratorRef.current.startReplay();
      setIsActive(true);
    } else {
      alert('No recorded session to replay. Record a session first.');
    }
  }, [currentSession, onCategoriesCleared]);
  
  // Stop replay
  const stopReplay = useCallback(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.stopReplay();
      setIsActive(false);
      
      // Reset video to beginning
      if (videoRef.current) {
        console.log('Resetting video position to start after replay');
        videoRef.current.currentTime = 0;
        
        // If it's playing, pause it
        if (!videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
      
      // Clear annotations
      if (annotationCanvasComponentRef.current) {
        console.log('Clearing annotations after replay stopped');
        if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
          annotationCanvasComponentRef.current.clearCanvasDrawings();
        }
      }
    }
  }, []);
  
  // Handle session completion
  const handleSessionComplete = useCallback((session: FeedbackSession) => {
    // First create a deep copy of the session to avoid any referential issues
    const sessionCopy = JSON.parse(JSON.stringify(session));
    
    // Deep copy the categories to ensure they're not references
    const categoriesCopy = JSON.parse(JSON.stringify(categories));
    
    // Log the actual values we're trying to save
    console.log('Current categories to save:', categoriesCopy);
    
    // Log which categories are true (selected)
    const selectedCategories = Object.entries(categoriesCopy)
      .filter(([_, value]) => value)
      .map(([key]) => key);
    console.log('Selected categories:', selectedCategories);
    
    // Add the categories to the session
    const sessionWithCategories = {
      ...sessionCopy,
      categories: categoriesCopy
    };
    
    setCurrentSession(sessionWithCategories);
    
    // Also update legacy feedbackData for compatibility
    const legacyData = convertSessionToLegacyData(sessionWithCategories);
    setFeedbackData(legacyData);
    
    console.log('Session completed with categories:', sessionWithCategories);
  }, [categories]);
  
  // Handle audio recording completed
  const handleAudioRecorded = useCallback((audioTrack: AudioTrack) => {
    console.log('Audio recorded:', audioTrack);
  }, []);
  
  // Draw annotation
  const drawAnnotation = useCallback((path: DrawingPath) => {
    // Only update the video time if it's not already set (for new annotations, not replayed ones)
    if (videoRef.current && !path.videoTime) {
      path.videoTime = videoRef.current.currentTime * 1000;
      
      console.log('Setting videoTime for new annotation:', path.videoTime);
    }
    
    // Pass annotation to the annotation canvas component via the VideoPlayer
    if (annotationCanvasComponentRef.current) {
      // Log the attempt to draw to aid debugging
      console.log('Drawing annotation via handleManualAnnotation:', {
        pathPoints: path.points?.length || 0,
        color: path.color,
        width: path.width,
        videoTime: path.videoTime,
        timeOffset: (path as any).timeOffset, // For debug only
        isReplay: !!path.videoTime // If videoTime is set, it's likely a replay
      });
      
      try {
        // Use the handleManualAnnotation method exposed by the AnnotationCanvas
        annotationCanvasComponentRef.current.handleManualAnnotation(path);
      } catch (error) {
        console.error('Error drawing annotation:', error);
      }
    } else {
      console.warn('Could not draw annotation: annotation canvas ref is not available');
    }
  }, []);
  
  // Clear annotations
  const clearAnnotations = useCallback(() => {
    if (annotationCanvasComponentRef.current) {
      console.log('Clearing annotations via clearCanvasDrawings');
      
      try {
        // Use the clearCanvasDrawings method exposed by the AnnotationCanvas
        if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
          annotationCanvasComponentRef.current.clearCanvasDrawings();
        } else {
          console.warn('clearCanvasDrawings method not found on annotationCanvas');
        }
      } catch (error) {
        console.error('Error clearing annotations:', error);
      }
    } else {
      console.warn('Could not clear annotations: annotation canvas ref is not available');
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
      console.log('Current session categories before download:', sessionCopy.categories);
      
      // Deep copy the categories to ensure they're not references
      const categoriesCopy = JSON.parse(JSON.stringify(categories));
      
      // Log which categories are currently selected
      const selectedCategories = Object.entries(categoriesCopy)
        .filter(([_, value]) => value)
        .map(([key]) => key);
      console.log('Selected categories for download:', selectedCategories);
      
      // Make sure we have the latest categories
      sessionCopy.categories = categoriesCopy;
      console.log('Updated session categories for download:', sessionCopy.categories);
      
      // Prepare audio chunks for serialization
      if (sessionCopy.audioTrack && sessionCopy.audioTrack.chunks.length > 0) {
        try {
          console.log(`Preparing ${sessionCopy.audioTrack.chunks.length} audio chunks for save...`);
          sessionCopy.audioTrack.chunks = await prepareAudioChunksForSave(sessionCopy.audioTrack.chunks);
          console.log('Audio chunks prepared successfully:', sessionCopy.audioTrack.chunks.length);
        } catch (error) {
          console.error('Failed to prepare audio chunks for saving:', error);
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
      console.error('Error during download process:', error);
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
          console.log('Loaded session categories:', loadedSession.categories);
          
          // Restore audio chunks with proper Blob objects if they exist
          if (loadedSession.audioTrack && loadedSession.audioTrack.chunks) {
            loadedSession.audioTrack.chunks = restoreAudioChunks(loadedSession.audioTrack.chunks);
          }
          
          setCurrentSession(loadedSession);
          // Also update legacy format for compatibility
          setFeedbackData(convertSessionToLegacyData(loadedSession));
          
          console.log('Loaded feedback session:', loadedSession);
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
          
          console.log('Loaded legacy feedback data and converted to session:', legacyData);
        }
      } catch (error) {
        console.error("Failed to parse uploaded file:", error);
        alert("Invalid feedback data file. Please upload a valid JSON file.");
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      alert('Error reading the file. Please try again.');
    };
    
    reader.readAsText(file);
  }, []);
  
  // Get an orchestrator reference
  const getOrchestratorRef = useCallback((orchestratorInstance: any) => {
    orchestratorRef.current = orchestratorInstance;
  }, []);
  
  // Method to record a category change
  const recordCategoryChange = useCallback((category: string, checked: boolean) => {
    if (orchestratorRef.current && mode === 'record' && isActive) {
      console.log(`Recording category change in orchestrator: ${category} = ${checked}`);
      orchestratorRef.current.handleCategoryEvent(category, checked);
    } else {
      console.warn('Unable to record category change - not in recording mode or not active');
    }
  }, [mode, isActive]);
  
  // Get a reference to the annotation canvas via the video player
  const getVideoPlayerRef = useCallback((videoPlayerInstance: any) => {
    // Store the video player reference
    annotationCanvasComponentRef.current = videoPlayerInstance?.annotationCanvas;
    
    // Log the reference to ensure we have it
    console.log('Got video player ref with annotation canvas:', {
      videoPlayer: !!videoPlayerInstance,
      annotationCanvas: !!videoPlayerInstance?.annotationCanvas,
      canvasMethods: videoPlayerInstance?.annotationCanvas ? 
        Object.keys(videoPlayerInstance.annotationCanvas) : []
    });
  }, []);
  
  // Listen for replay progress to detect completion
  useEffect(() => {
    if (orchestratorRef.current && mode === 'replay' && isActive) {
      // Check if orchestrator has a replayProgress property
      const progress = orchestratorRef.current.replayProgress;
      if (progress === 100) {
        // Replay has completed, reset the UI state
        console.log('Detected replay completion via progress = 100%, resetting UI state');
        setIsActive(false);
        
        // Reset video to beginning
        if (videoRef.current) {
          console.log('Auto-resetting video position to start after replay completion');
          videoRef.current.currentTime = 0;
          
          // If it's playing, pause it
          if (!videoRef.current.paused) {
            videoRef.current.pause();
          }
        }
        
        // Clear annotations
        if (annotationCanvasComponentRef.current) {
          console.log('Auto-clearing annotations after replay completion');
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

  // Define window type with our custom property
  declare global {
    interface Window {
      __videoPlayerWrapper?: {
        recordCategoryChange: (category: string, checked: boolean) => void;
        isRecording: boolean;
      };
    }
  }
  
  // Expose methods to the parent component and notify about mode changes
  useEffect(() => {
    // This runs once when the component mounts and when dependencies change
    if (typeof window !== 'undefined') {
      // Set global reference available to parent component
      window.__videoPlayerWrapper = {
        recordCategoryChange,
        isRecording: mode === 'record' && isActive
      };
    }
    
    // Notify parent component about replay mode changes
    if (onReplayModeChange) {
      const isReplay = mode === 'replay';
      console.log(`Notifying parent about replay mode: ${isReplay}`);
      onReplayModeChange(isReplay);
    }
    
    return () => {
      // Clean up on unmount
      if (typeof window !== 'undefined' && window.__videoPlayerWrapper) {
        delete window.__videoPlayerWrapper;
      }
    };
  }, [recordCategoryChange, mode, isActive, onReplayModeChange]);
  
  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Video Player</h2>
          
          <div className="flex space-x-2">
            {!isActive ? (
              <>
                <button
                  onClick={startRecording}
                  className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-white"></span>
                  Start Recording
                </button>
                
                <button
                  onClick={startReplay}
                  disabled={!currentSession}
                  className={`flex items-center gap-1 py-2 px-4 rounded-md transition-colors ${
                    currentSession 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286l-11.54 6.347c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                  </svg>
                  Replay Session
                  {!currentSession && (
                    <span className="text-xs ml-1">(No recordings)</span>
                  )}
                </button>
                
                <button
                  onClick={downloadSessionData}
                  disabled={!currentSession}
                  className={`bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors ${
                    !currentSession ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Download Data
                </button>
                
                <label className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md transition-colors cursor-pointer">
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                  Load Data
                </label>
              </>
            ) : (
              <button
                onClick={mode === 'record' ? stopRecording : stopReplay}
                className={`flex items-center gap-1 ${
                  mode === 'record' 
                    ? 'bg-gray-700 hover:bg-gray-800' 
                    : 'bg-yellow-500 hover:bg-yellow-600'
                } text-white py-2 px-4 rounded-md transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                </svg>
                {mode === 'record' ? 'Stop Recording' : 'Stop Replay'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Feedback Orchestrator handles all coordination */}
      <div className="relative">
        <VideoPlayer 
          ref={getVideoPlayerRef}
          isRecording={mode === 'record' && isActive}
          isReplaying={mode === 'replay' && isActive}
          setVideoRef={setVideoElementRef}
          replayAnnotations={feedbackData.annotations || []}
          onRecordAction={(action) => {
            // Forward video actions to the orchestrator
            if (orchestratorRef.current && mode === 'record' && isActive) {
              switch(action.type) {
                case 'play':
                case 'pause':
                case 'seek':
                case 'volume':
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
        />
        
        {/* Initialize the Orchestrator */}
        <FeedbackOrchestrator
          videoElementRef={videoRef}
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
              console.log('WRAPPER: Received loaded categories from orchestrator:', loadedCategories);
              
              // First clear existing categories
              if (onCategoriesCleared) {
                console.log('WRAPPER: Clearing existing categories before loading new ones');
                onCategoriesCleared();
              }
              
              // Check if we have any true categories
              const hasCheckedCategories = Object.values(loadedCategories).some(isChecked => isChecked);
              console.log(`WRAPPER: Has checked categories: ${hasCheckedCategories}`);
              
              // Then load the saved categories using the callback if available
              if (hasCheckedCategories && onCategoriesLoaded) {
                console.log('WRAPPER: Passing categories to parent component');
                
                // Delay slightly to ensure UI state is updated properly after clearing
                setTimeout(() => {
                  onCategoriesLoaded(loadedCategories);
                }, 100);
              } else {
                console.log('WRAPPER: No checked categories or no callback available');
              }
            } else {
              console.warn('WRAPPER: No categories data received from orchestrator');
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
                <p><strong>Categories:</strong></p>
                <ul className="list-disc ml-5">
                  {Object.entries(currentSession.categories)
                    .filter(([_, isSelected]) => isSelected)
                    .map(([category]) => (
                      <li key={category}>
                        {category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
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
                      Category: {getCategoryLabel(event.payload.category)} {event.payload.checked ? '(added)' : '(removed)'}
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