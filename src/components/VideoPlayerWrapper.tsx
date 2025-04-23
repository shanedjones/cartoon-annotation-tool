'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { VideoPlayerRef } from '../types/media';
import type { DrawingPath } from '../types/annotation';
import FeedbackOrchestrator, { FeedbackSession, AudioTrack, FeedbackOrchestratorRef } from './FeedbackOrchestrator';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  getCategoryLabel, 
  prepareSessionForStorage,
  restoreAudioChunksInSession
} from '../utils/dataConversion';

// Dynamically import the VideoPlayer with no SSR
const VideoPlayer = dynamic(() => import('./VideoPlayer'), { ssr: false });

interface VideoPlayerWrapperProps {
  categories?: Record<string, number | null>;
  onCategoriesCleared?: () => void;
  onCategoriesLoaded?: (categories: Record<string, number>) => void;
  onReplayModeChange?: (isReplay: boolean) => void;
  onVideoLoadingChange?: (isLoading: boolean) => void;
  videoUrl?: string;
  videoId?: string;
  // contentToReview removed - unused
  initialSession?: Record<string, unknown>; // Allow passing an initial session from Cosmos DB
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
  initialSession,
  onSessionComplete
}: VideoPlayerWrapperProps) {
  // Log categories passed from parent on every render
  console.log('VideoPlayerWrapper received categories:', categories);
  const [mode, setMode] = useState<'record' | 'replay'>('record');
  const [isActive, setIsActive] = useState(false);
  // State for tracking video loading status
  const [, setIsVideoLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<FeedbackSession | null>(initialSession || null);
  
  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Create a properly typed ref for the FeedbackOrchestrator
  const orchestratorVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<FeedbackOrchestratorRef | null>(null);
  const annotationCanvasComponentRef = useRef<{ handleManualAnnotation: (path: DrawingPath) => void; clearCanvasDrawings: () => void } | null>(null);
  
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
      console.log('Stopping recording session');
      
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
      
      // Make sure session availability is updated immediately
      if (typeof window !== 'undefined') {
        window.__hasRecordedSession = true;
        console.log('Session available flag set to true after stopping recording');
        
        // Dispatch a custom event to notify about session availability
        window.dispatchEvent(new Event('session-available'));
      }
    }
  }, [onCategoriesCleared]);
  
  // Start replaying the recorded session with optimized state changes
  const startReplay = useCallback(() => {
    // Prepare everything before changing state
    // This prevents multiple re-renders
    
    // Prepare canvas
    if (annotationCanvasComponentRef.current && annotationCanvasComponentRef.current.clearCanvasDrawings) {
      console.log('Clearing annotations before starting replay');
      annotationCanvasComponentRef.current.clearCanvasDrawings();
    }
    
    // Prepare video if available
    if (videoRef.current) {
      console.log('Resetting video position before starting replay');
      videoRef.current.currentTime = 0;
    }
    
    if (orchestratorRef.current && currentSession) {
      // First, handle categories clearing if needed
      if (onCategoriesCleared) {
        console.log('Clearing categories before replay');
        onCategoriesCleared();
      }
      
      console.log('Replaying session with categories:', currentSession.categories);
      
      // Load the session if needed
      if (typeof window !== 'undefined' && !window.__sessionReady) {
        console.log('Loading session data');
        orchestratorRef.current.loadSession(currentSession);
      }
      
      // Now batch the state updates to reduce re-renders
      try {
        // Batch state updates together to minimize renders
        console.log('Batching state updates for replay');
        setMode('replay');
        setIsActive(true);
        
        // Use setTimeout to ensure state updates have completed
        // before starting the replay, which prevents race conditions
        setTimeout(() => {
          if (orchestratorRef.current) {
            console.log('Starting replay after state updates');
            orchestratorRef.current.startReplay();
            
            // Set the completed review status if needed
            if (typeof window !== 'undefined' && window.__isCompletedVideo) {
              console.log('Starting replay of completed review');
            }
          }
        }, 0);
      } catch (error) {
        console.error('Error in replay state updates:', error);
      }
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
      .filter(([, value]) => value)
      .map(([key]) => key);
    console.log('Selected categories:', selectedCategories);
    
    // Add the categories to the session
    const sessionWithCategories = {
      ...sessionCopy,
      categories: categoriesCopy
    };
    
    setCurrentSession(sessionWithCategories);
    
    // Update session availability flag immediately
    if (typeof window !== 'undefined') {
      window.__hasRecordedSession = true;
      console.log('Session available flag set to true');
      
      // Dispatch a custom event to notify about session availability
      window.dispatchEvent(new Event('session-available'));
    }
    
    console.log('Session completed with categories:', sessionWithCategories);
    
    // Call the parent's onSessionComplete callback if provided
    if (onSessionComplete) {
      onSessionComplete(sessionWithCategories);
    }
  }, [categories, onSessionComplete]);
  
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
        timeOffset: path.timeOffset, // For debug only
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
        .filter(([, value]) => value)
        .map(([key]) => key);
      console.log('Selected categories for download:', selectedCategories);
      
      // Make sure we have the latest categories
      sessionCopy.categories = categoriesCopy;
      console.log('Updated session categories for download:', sessionCopy.categories);
      
      // Prepare session for storage using the new simplified function
      try {
        console.log(`Preparing session with ${sessionCopy.audioTrack?.chunks?.length || 0} audio chunks for save...`);
        const preparedSession = await prepareSessionForStorage(sessionCopy);
        console.log('Session prepared successfully');
        
        const dataStr = JSON.stringify(preparedSession, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `feedback-session-${currentSession.id}.json`);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
      } catch (error) {
        console.error('Failed to prepare session for saving:', error);
        alert('There was an issue preparing data for download. Some content may be missing.');
      }
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
        
        // Validate that this is a proper FeedbackSession
        if (!jsonData.id || !jsonData.events || !jsonData.audioTrack) {
          throw new Error('Invalid feedback session format');
        }
        
        // It's the FeedbackSession format
        const loadedSession = jsonData as FeedbackSession;
        
        // Log if we have categories
        console.log('Loaded session categories:', loadedSession.categories);
        
        // Restore audio chunks with proper Blob objects if they exist
        if (loadedSession.audioTrack && loadedSession.audioTrack.chunks) {
          // Use the new simplified restore function
          const restoredSession = restoreAudioChunksInSession(loadedSession);
          setCurrentSession(restoredSession);
          console.log('Loaded feedback session with restored audio:', restoredSession);
        } else {
          setCurrentSession(loadedSession);
          console.log('Loaded feedback session (no audio to restore):', loadedSession);
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
  const getOrchestratorRef = useCallback((orchestratorInstance: FeedbackOrchestratorRef) => {
    orchestratorRef.current = orchestratorInstance;
  }, []);
  
  // Method to record a category change
  const recordCategoryChange = useCallback((category: string, rating: number) => {
    if (orchestratorRef.current) {
      console.log(`Recording category change in orchestrator: ${category} = ${rating}`);
      
      // Check if recording is active - if not, initiate a minimal session if needed
      if (!isActive && mode === 'record') {
        console.log('Not actively recording, but will still save category rating');
        // If we don't have a current session, create a simple one for storing categories
        if (!currentSession) {
          console.log('Creating minimal session for categories');
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
      console.warn('Unable to record category change - orchestrator not available');
    }
  }, [mode, isActive, currentSession, videoId]);
  
  // Get a reference to the annotation canvas via the video player
  const getVideoPlayerRef = useCallback((videoPlayerInstance: VideoPlayerRef) => {
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

  // Using the Window interface defined in src/types/global.d.ts
  
  // Expose methods to the parent component and notify about mode changes
  useEffect(() => {
    // This runs once when the component mounts and when dependencies change
    if (typeof window !== 'undefined') {
      // Set global reference available to parent component
      window.__videoPlayerWrapper = {
        recordCategoryChange,
        isRecording: mode === 'record' && isActive
      };
      
      // Update session availability flag
      window.__hasRecordedSession = currentSession !== null;
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
  }, [recordCategoryChange, mode, isActive, onReplayModeChange, currentSession]);
  
  // Load session but only start replay if not a completed video
  useEffect(() => {
    if (initialSession && !isActive && mode === 'record') {
      console.log("Initial session provided, preparing for replay");
      
      // Set a small delay to ensure everything is properly initialized
      setTimeout(() => {
        if (orchestratorRef.current) {
          // Set the current session
          setCurrentSession(initialSession);
          
          // Load the session without auto-starting replay or switching mode yet
          orchestratorRef.current.loadSession(initialSession);
          
          // Check if this is a new session or a completed video
          if (typeof window !== 'undefined' && !window.__isCompletedVideo) {
            console.log("Auto-starting replay for new session");
            // For new reviews, we auto-start and switch to replay mode
            setMode('replay');
            orchestratorRef.current.startReplay();
            setIsActive(true);
          } else {
            console.log("Completed video review - replay is ready but not auto-started");
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
  }, [initialSession, isActive, mode, orchestratorRef]);
  
  // Just use the provided videoUrl directly, no context needed
  const contextVideoUrl = videoUrl;
  
  // Log when the effective URL changes
  useEffect(() => {
    console.log('VideoPlayerWrapper: Context effective URL:', contextVideoUrl);
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
          <ErrorBoundary name="VideoPlayer" fallback={
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h2 className="text-lg font-medium text-yellow-800 mb-2">Video Player Error</h2>
              <p className="text-sm text-yellow-600">
                There was a problem loading the video player. Try refreshing the page.
              </p>
            </div>
          }>
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
                console.log(`Preparing annotation for replay: tool=${tool}, points=${e.payload.path.points?.length}`);
                
                return {
                  ...e.payload.path,
                  timeOffset: e.timeOffset,
                  globalTimeOffset: e.timeOffset,
                  videoTime: e.timeOffset,
                  tool: tool  // Explicitly set the tool to ensure it's included
                };
              }) || []}
            videoUrl={videoUrl}
            onLoadingStateChange={(isLoading) => {
              console.log('Video loading state changed:', isLoading);
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
          />
          </ErrorBoundary>
          
          {/* Initialize the Orchestrator */}
          <ErrorBoundary name="FeedbackOrchestrator" fallback={
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h2 className="text-lg font-medium text-yellow-800 mb-2">Feedback System Error</h2>
              <p className="text-sm text-yellow-600">
                There was a problem with the feedback recording system. Try refreshing the page.
              </p>
            </div>
          }>
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
                  // Convert boolean values to numbers (1 for true, 0 for false)
                  const numberCategories: Record<string, number> = {};
                  Object.entries(loadedCategories).forEach(([key, value]) => {
                    numberCategories[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value as number;
                  });
                  onCategoriesLoaded(numberCategories);
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
          </ErrorBoundary>
      </div>
      
      {currentSession && (
        <ErrorBoundary name="SessionDisplay" fallback={
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h2 className="text-lg font-medium text-yellow-800 mb-2">Session Display Error</h2>
            <p className="text-sm text-yellow-600">
              There was a problem displaying session details. Your recording is still saved.
            </p>
          </div>
        }>
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
                    .filter(([, rating]) => rating !== null && (typeof rating === 'boolean' ? rating : rating > 0))
                    .map(([category, rating]) => (
                      <li key={category}>
                        <div>
                          {category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                        </div>
                        <div className="text-yellow-500 flex text-sm">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= (rating as number) ? 'text-yellow-500' : 'text-gray-300'}>
                              ★
                            </span>
                          ))}
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
        </ErrorBoundary>
      )}
    </div>
  );
}