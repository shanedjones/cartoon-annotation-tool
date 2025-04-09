'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTimeline, useLastClearTime } from '../contexts/TimelineContext';
import { useVideoSource, useVideoControls } from '../contexts/VideoContext';

// Add a utility function to check if a URL is a cross-origin URL
const isCrossOriginUrl = (url: string): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const urlObj = new URL(url, window.location.href);
    return urlObj.origin !== window.location.origin;
  } catch (e) {
    return false;
  }
};

// Define the types of events we want to record
export type ActionType = 'play' | 'pause' | 'seek' | 'playbackRate' | 'keyboardShortcut' | 'annotation' | 'audio';

// Define the structure of a recorded action
export interface RecordedAction {
  type: ActionType;
  timestamp: number; // Time in milliseconds since recording started
  videoTime: number; // Current time in the video
  details?: {
    [key: string]: any; // Additional details specific to the action
  };
}

import AnnotationCanvas, { DrawingPath, DrawingTool } from './AnnotationCanvas';

import { AudioChunk } from './AudioRecorder';

export interface FeedbackData {
  sessionId: string;
  videoId: string;
  actions: RecordedAction[];
  startTime: number;
  endTime?: number;
  annotations?: DrawingPath[];
  audioChunks?: AudioChunk[];
}

interface VideoPlayerProps {
  isRecording?: boolean;
  isReplaying?: boolean;
  onRecordAction?: (action: RecordedAction) => void;
  setVideoRef?: (ref: HTMLVideoElement | null) => void;
  replayAnnotations?: DrawingPath[];
  onAnnotationAdded?: (annotation: DrawingPath) => void;
  videoUrl?: string;
}

interface VideoPlayerImperativeHandle {
  video: HTMLVideoElement | null;
  annotationCanvas: any;
}

// Define the VideoPlayer component with proper memoization
const VideoPlayer = React.memo(React.forwardRef<VideoPlayerImperativeHandle, VideoPlayerProps>(({ 
  isRecording = false, 
  isReplaying = false,
  onRecordAction,
  setVideoRef,
  replayAnnotations = [],
  onAnnotationAdded,
  videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
}: VideoPlayerProps, ref) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isAnnotationEnabled, setIsAnnotationEnabled] = useState(true);
  const [annotationColor, setAnnotationColor] = useState('#ff0000'); // Default red
  const [annotationWidth, setAnnotationWidth] = useState(3);
  const [annotationTool, setAnnotationTool] = useState<DrawingTool>('freehand');
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [shouldClearCanvas, setShouldClearCanvas] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVideoCached, setIsVideoCached] = useState(false);
  const [cachedVideoSrc, setCachedVideoSrc] = useState<string | null>(null);
  const [isLoadStarted, setIsLoadStarted] = useState(false);
  
  // Use contexts
  const { updatePosition } = useTimeline();
  const { updateClearTime } = useLastClearTime();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const annotationCanvasRef = useRef<any>(null);

  // Initialize recording start time when recording begins
  useEffect(() => {
    if (isRecording && !recordingStartTimeRef.current) {
      recordingStartTimeRef.current = Date.now();
    } else if (!isRecording) {
      recordingStartTimeRef.current = null;
    }
  }, [isRecording]);
  
  // Use the video context hooks with try/catch to handle case where context might not be available
  let effectiveUrl, isContextLoading, videoControls;
  try {
    const videoSource = useVideoSource();
    effectiveUrl = videoSource?.effectiveUrl;
    isContextLoading = videoSource?.isLoading;
    
    videoControls = useVideoControls();
  } catch (error) {
    console.warn('Video context not available:', error);
    effectiveUrl = null;
    isContextLoading = false;
    videoControls = null;
  }
  
  // Create a local video blob cache if needed (fallback if context isn't working)
  const localBlobCache = useRef<Record<string, string>>({});
  
  // Debug info about video URLs
  useEffect(() => {
    console.log('VideoPlayer URLs:', { 
      propUrl: videoUrl,
      effectiveUrl,
      cachedVideoSrc
    });
  }, [videoUrl, effectiveUrl, cachedVideoSrc]);
  
  // States for error handling
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Directly handle loading videos with improved error handling
  useEffect(() => {
    // Skip if no URL or already started loading
    if (!videoUrl || isLoadStarted) return;
    
    console.log('Starting video loading process for:', videoUrl);
    setIsLoading(true);
    setIsLoadStarted(true);
    setHasError(false); // Reset error state
    setErrorMessage('');
    
    // Wait for the video context to handle caching
    if (effectiveUrl) {
      // Cache resolution successful
      console.log('Cache resolution successful, using URL:', effectiveUrl);
      setCachedVideoSrc(effectiveUrl);
      setIsLoading(false);
      setIsVideoCached(true);
    } else {
      // Wait for context to resolve
      // Don't set video src yet
      console.log('Waiting for video context to resolve cache status');
    }
  }, [videoUrl, effectiveUrl, isLoadStarted]);
  
  // Handle cache failures by checking context error status
  useEffect(() => {
    const videoSource = useVideoSource();
    // Check if the context has an error
    if (videoSource?.hasError && videoUrl && isLoadStarted) {
      console.error('Video caching failed for:', videoUrl);
      setHasError(true);
      setErrorMessage(videoSource.errorMessage || 'Unable to load video. Please contact technical support.');
      setIsLoading(false);
    }
  }, [videoUrl, isLoadStarted]);
  
  // Consolidated video loading event handling
  useEffect(() => {
    if (!videoRef.current) return;
    
    // Create a single handler for all loading-related events
    const handleVideoLoad = () => {
      if (videoRef.current) {
        const readyState = videoRef.current.readyState;
        console.log('Video load event triggered - readyState:', readyState);
        
        // Set duration if available
        if (readyState >= 1 && videoRef.current.duration) {
          setDuration(videoRef.current.duration);
        }
        
        // Update loading state based on readiness
        if (readyState >= 2 && isLoading) {
          setIsLoading(false);
        }
        
        // Mark as cached once canplaythrough fires
        if (readyState >= 4 && !isVideoCached) {
          setIsVideoCached(true);
          
          // Store in local cache if using direct URL mode
          if (videoUrl && !cachedVideoSrc) {
            console.log('Video ready for playthrough, marking as cached:', videoUrl);
            // Use our local cache ref to store this information
            localBlobCache.current[videoUrl] = videoUrl;
          }
        }
      }
    };
    
    // Add listeners for all relevant events
    videoRef.current.addEventListener('loadedmetadata', handleVideoLoad);
    videoRef.current.addEventListener('loadeddata', handleVideoLoad);
    videoRef.current.addEventListener('canplay', handleVideoLoad);
    videoRef.current.addEventListener('canplaythrough', handleVideoLoad);
    videoRef.current.addEventListener('durationchange', handleVideoLoad);
    
    // Initial check in case events already fired
    if (videoRef.current.readyState >= 2) {
      handleVideoLoad();
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', handleVideoLoad);
        videoRef.current.removeEventListener('loadeddata', handleVideoLoad);
        videoRef.current.removeEventListener('canplay', handleVideoLoad);
        videoRef.current.removeEventListener('canplaythrough', handleVideoLoad);
        videoRef.current.removeEventListener('durationchange', handleVideoLoad);
      }
    };
  }, [videoRef.current, isLoading, isVideoCached, videoUrl, cachedVideoSrc]);
  
  // Pass video element reference to parent component
  useEffect(() => {
    if (setVideoRef && videoRef.current) {
      setVideoRef(videoRef.current);
    }
    
    return () => {
      if (setVideoRef) {
        setVideoRef(null);
      }
    };
  }, [setVideoRef, videoRef.current]);
  
  // Update video dimensions when video metadata is loaded
  useEffect(() => {
    const updateVideoDimensions = () => {
      if (videoRef.current && videoContainerRef.current) {
        const containerRect = videoContainerRef.current.getBoundingClientRect();
        setVideoDimensions({
          width: containerRect.width,
          height: containerRect.height
        });
      }
    };
    
    // Initial update
    if (videoRef.current) {
      if (videoRef.current.readyState >= 1) {
        updateVideoDimensions();
      } else {
        videoRef.current.addEventListener('loadedmetadata', updateVideoDimensions);
      }
    }
    
    // Update dimensions on window resize
    window.addEventListener('resize', updateVideoDimensions);
    
    return () => {
      window.removeEventListener('resize', updateVideoDimensions);
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', updateVideoDimensions);
      }
    };
  }, [videoRef.current]);
  
  // Handle annotation being added
  const handleAnnotationAdded = (path: DrawingPath) => {
    // Calculate the global timeline offset
    const globalTimeOffset = isRecording && recordingStartTimeRef.current ? 
      Date.now() - recordingStartTimeRef.current : 0;
    
    // Update the annotation with both global time and video time
    const annotationWithTiming = {
      ...path,
      // Store both the original timestamp (relative to the recording start)
      videoTime: currentTime * 1000,
      // Add global timeline offset for proper replay synchronization
      globalTimeOffset: globalTimeOffset,
      // Ensure tool type is always included
      tool: path.tool || 'freehand'
    };
    
    // If recording, pass the annotation to the parent
    if (isRecording && onAnnotationAdded) {
      onAnnotationAdded(annotationWithTiming);
    }
    
    // Record the annotation action
    if (isRecording && recordingStartTimeRef.current && onRecordAction) {
      const action: RecordedAction = {
        type: 'annotation',
        timestamp: globalTimeOffset,
        videoTime: currentTime,
        details: { path: annotationWithTiming }
      };
      onRecordAction(action);
    }
  };
  
  // Toggle annotation mode - removed as drawing is always enabled
  
  // Clear annotations
  const clearAnnotations = () => {
    setShouldClearCanvas(true);
    
    // Record the clear action if recording
    if (isRecording && recordingStartTimeRef.current && onRecordAction) {
      // Calculate global timeline offset
      const globalTimeOffset = Date.now() - recordingStartTimeRef.current;
      
      console.log(`Recording canvas clear at global time ${globalTimeOffset}ms, video time ${currentTime}s`);
      
      // Update last clear time using context
      updateClearTime(globalTimeOffset);
      console.log(`Updated lastClearTime via context to ${globalTimeOffset}ms`);
      
      const action: RecordedAction = {
        type: 'annotation',
        timestamp: globalTimeOffset,
        videoTime: currentTime,
        details: { 
          action: 'clear', // Ensure consistent action name
          clear: true,
          globalTimeOffset: globalTimeOffset // Add global timeline information
        }
      };
      onRecordAction(action);
    }
  };
  
  // Handle canvas clear completion
  const handleClearComplete = () => {
    setShouldClearCanvas(false);
  };

  // Function to record an action if recording is enabled
  const recordAction = (type: ActionType, details?: {[key: string]: any}) => {
    if (isRecording && recordingStartTimeRef.current && onRecordAction) {
      // Calculate the global timeline offset
      const globalTimeOffset = Date.now() - recordingStartTimeRef.current;
      
      const action: RecordedAction = {
        type,
        timestamp: globalTimeOffset,
        videoTime: currentTime,
        // Add global timeline information to all actions
        details: {
          ...details,
          globalTimeOffset: globalTimeOffset
        }
      };
      
      console.log(`Recording ${type} action at global time ${globalTimeOffset}ms, video time ${currentTime}s`);
      onRecordAction(action);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        videoControls?.pause?.(); // Update context if method exists
        recordAction('pause');
      } else {
        videoRef.current.play();
        videoControls?.play?.(); // Update context if method exists
        recordAction('play');
      }
      setPlaying(!playing);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      // Update both component state and context to reflect the current video time
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      // Only call updateTime if it exists (using optional chaining)
      videoControls?.updateTime?.(time);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      console.log('Video metadata loaded, duration:', videoRef.current.duration);
      const duration = videoRef.current.duration;
      setDuration(duration);
      // Only call updateDuration if it exists (using optional chaining)
      videoControls?.updateDuration?.(duration);
    }
  };
  
  // Add additional event handler for duration change
  const handleDurationChange = () => {
    if (videoRef.current) {
      console.log('Video duration changed:', videoRef.current.duration);
      const duration = videoRef.current.duration;
      setDuration(duration);
      // Only call updateDuration if it exists (using optional chaining)
      videoControls?.updateDuration?.(duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const result = seekToTime(time);
    if (result) {
      recordAction('seek', { from: result.previousTime, to: result.newTime });
    }
  };
  
  // Add a separate function for direct seeking when clicking on the slider
  const handleSliderClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const element = e.target as HTMLInputElement;
    const rect = element.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = offsetX / rect.width;
    const time = percentage * duration;
    
    const result = seekToTime(time);
    if (result) {
      recordAction('seek', { from: result.previousTime, to: result.newTime });
    }
  };


  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      const previousRate = videoRef.current.playbackRate;
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      // Update context if the method exists
      videoControls?.setPlaybackRate?.(rate);
      recordAction('playbackRate', { from: previousRate, to: rate });
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time < 0) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Helper function to seek to a specific time
  const seekToTime = (time: number) => {
    if (videoRef.current) {
      const previousTime = videoRef.current.currentTime;
      const newTime = Math.max(0, Math.min(duration, time));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      // Update the video context, only if the method exists
      videoControls?.seek?.(newTime);
      return { previousTime, newTime };
    }
    return null;
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'k') {
        togglePlay();
        recordAction('keyboardShortcut', { key: e.key, action: playing ? 'pause' : 'play' });
      } else if (e.key === 'ArrowLeft') {
        if (videoRef.current) {
          const result = seekToTime(videoRef.current.currentTime - 5);
          if (result) {
            recordAction('keyboardShortcut', { 
              key: e.key, 
              action: 'rewind',
              from: result.previousTime,
              to: result.newTime 
            });
          }
        }
      } else if (e.key === 'ArrowRight') {
        if (videoRef.current) {
          const result = seekToTime(videoRef.current.currentTime + 5);
          if (result) {
            recordAction('keyboardShortcut', { 
              key: e.key, 
              action: 'forward',
              from: result.previousTime,
              to: result.newTime
            });
          }
        }
      // 'm' shortcut removed
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duration, playing, isRecording, currentTime]);

  // First useImperativeHandle is removed as it's duplicated below

  // Expose handlers for AnnotationCanvas 
  const handleManualAnnotation = (path: DrawingPath) => {
    if (annotationCanvasRef.current) {
      annotationCanvasRef.current.handleManualAnnotation(path);
    }
  };

  const clearAllAnnotations = () => {
    if (annotationCanvasRef.current) {
      annotationCanvasRef.current.clearCanvasDrawings();
    }
  };

  // Add methods to imperativeHandle 
  React.useImperativeHandle(ref, () => ({
    // Expose the video element
    video: videoRef.current,
    
    // Expose the annotation canvas and its methods
    annotationCanvas: annotationCanvasRef.current,
    
    // Expose annotation methods directly at the top level for easier access
    handleManualAnnotation: (path: DrawingPath) => {
      if (annotationCanvasRef.current) {
        console.log('VideoPlayer: Forwarding manual annotation to canvas');
        annotationCanvasRef.current.handleManualAnnotation(path);
        
        // If recording is active, also record this event
        if (isRecording && onRecordAction) {
          const action: RecordedAction = {
            type: 'annotation',
            timestamp: Date.now() - (recordingStartTimeRef.current || 0),
            videoTime: currentTime,
            details: { path }
          };
          onRecordAction(action);
        }
      } else {
        console.warn('VideoPlayer: Cannot forward annotation - canvas ref not available');
      }
    },
    
    clearAllAnnotations: () => {
      if (annotationCanvasRef.current) {
        console.log('VideoPlayer: Forwarding clear annotation to canvas');
        annotationCanvasRef.current.clearCanvasDrawings();
        
        // If recording is active, also record this event
        if (isRecording && onRecordAction) {
          // Calculate global timeline offset
          const globalTimeOffset = Date.now() - (recordingStartTimeRef.current || 0);
          
          console.log(`Recording canvas clear via clearAllAnnotations at global time ${globalTimeOffset}ms`);
          
          // Update last clear time using context
          updateClearTime(globalTimeOffset);
          console.log(`Updated lastClearTime via context to ${globalTimeOffset}ms`);
          
          const action: RecordedAction = {
            type: 'annotation',
            timestamp: globalTimeOffset,
            videoTime: currentTime,
            details: { 
              action: 'clear', // Ensure consistent action name
              clear: true,
              globalTimeOffset: globalTimeOffset
            }
          };
          onRecordAction(action);
        }
      } else {
        console.warn('VideoPlayer: Cannot clear annotations - canvas ref not available');
      }
    }
  }));

  return (
    <div className="flex flex-col w-full max-w-3xl bg-gray-100 rounded-lg shadow-md overflow-hidden">
      <div className="relative" ref={videoContainerRef}>
        {isRecording && (
          <div className="absolute top-2 right-2 z-20 flex items-center px-2 py-1 bg-red-500 text-white rounded-md text-sm">
            <span className="animate-pulse mr-1">●</span> Recording
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-30">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-2"></div>
            <p className="text-white font-medium">Loading video...</p>
            <p className="text-white text-sm mt-1">{isVideoCached ? 'Video will be cached for future viewing' : 'Please wait while the video loads'}</p>
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-30">
            <div className="text-red-500 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-white text-lg font-bold mb-2">Video Error</p>
            <p className="text-white text-center max-w-md px-4">{errorMessage}</p>
            <p className="text-white text-sm mt-4">Please contact support at support@example.com</p>
          </div>
        )}
        <video
          ref={videoRef}
          className="w-full aspect-video"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          src={cachedVideoSrc}
          playsInline
          preload="metadata"
          muted
          // Only use cachedVideoSrc which is set after caching completes
        />
        
        {videoDimensions.width > 0 && videoDimensions.height > 0 && (
          <AnnotationCanvas
            ref={annotationCanvasRef}
            width={videoDimensions.width}
            height={videoDimensions.height}
            isEnabled={isAnnotationEnabled && !isReplaying}
            currentTime={currentTime}
            isRecording={isRecording}
            isReplaying={isReplaying}
            onAnnotationAdded={handleAnnotationAdded}
            replayAnnotations={replayAnnotations}
            toolColor={annotationColor}
            toolWidth={annotationWidth}
            toolType={annotationTool}
            clearCanvas={shouldClearCanvas}
            onClearComplete={handleClearComplete}
          />
        )}
      </div>
      
      <div className="p-4 bg-white">
        <div className="flex items-center mb-2 relative">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            onClick={handleSliderClick}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer relative z-10
                      focus:outline-none focus:ring-2 focus:ring-blue-300
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:bg-blue-500
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:border-0
                      [&::-webkit-slider-thumb]:shadow
                      [&::-webkit-slider-thumb]:cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, #e5e7eb ${(currentTime / (duration || 1)) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
            >
              {playing ? 
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                </svg>
                :
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286l-11.54 6.347c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
              }
            </button>
            
            
            <span className="text-sm text-gray-600">
              {formatTime(currentTime)} / {duration ? formatTime(duration) : '0:00'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <select 
              value={playbackRate}
              onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
              className="bg-gray-200 text-sm rounded px-2 py-1"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
        
        {/* Annotation controls */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Tool:</label>
              <div className="flex bg-gray-100 rounded overflow-hidden border border-gray-300">
                <button
                  onClick={() => setAnnotationTool('freehand')}
                  className={`py-1 px-2 text-xs ${annotationTool === 'freehand' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Pen
                </button>
                <button
                  onClick={() => setAnnotationTool('line')}
                  className={`py-1 px-2 text-xs ${annotationTool === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Line
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Color:</label>
              <select
                value={annotationColor}
                onChange={(e) => setAnnotationColor(e.target.value)}
                className="bg-gray-100 text-xs rounded p-1 border border-gray-300"
              >
                <option value="#ff0000">Red</option>
                <option value="#0000ff">Blue</option>
                <option value="#00ff00">Green</option>
                <option value="#ffff00">Yellow</option>
                <option value="#000000">Black</option>
                <option value="#ffffff">White</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Width:</label>
              <select
                value={annotationWidth}
                onChange={(e) => setAnnotationWidth(parseInt(e.target.value))}
                className="bg-gray-100 text-xs rounded p-1 border border-gray-300"
              >
                <option value="1">Thin</option>
                <option value="3">Medium</option>
                <option value="5">Thick</option>
                <option value="8">Very Thick</option>
              </select>
            </div>
            
            <button
              onClick={clearAnnotations}
              className="py-1 px-3 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
              disabled={isReplaying}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}));

// Add displayName for better debugging in React DevTools
VideoPlayer.displayName = 'VideoPlayer';

// Custom comparison function for memoization
const arePropsEqual = (prevProps: VideoPlayerProps, nextProps: VideoPlayerProps) => {
  // Only re-render if these props changed
  return (
    prevProps.videoUrl === nextProps.videoUrl &&
    prevProps.isRecording === nextProps.isRecording &&
    prevProps.isReplaying === nextProps.isReplaying &&
    // Simplistic comparison of replay annotations (optimally would do deep compare)
    prevProps.replayAnnotations === nextProps.replayAnnotations
  );
};

// Export with proper memo implementation
export default React.memo(VideoPlayer, arePropsEqual);