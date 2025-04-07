'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTimeline, useLastClearTime } from '../contexts/TimelineContext';

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

const VideoPlayer = React.forwardRef<VideoPlayerImperativeHandle, VideoPlayerProps>(({ 
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
  
  // Use timeline context
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
  
  // Force update duration when video is loaded
  useEffect(() => {
    if (videoRef.current) {
      if (videoRef.current.readyState >= 2) {
        console.log('Video ready, setting duration from useEffect:', videoRef.current.duration);
        setDuration(videoRef.current.duration);
      }
      
      // Add extra event listener for duration availability
      const onDurationAvailable = () => {
        console.log('Duration available event triggered:', videoRef.current?.duration);
        if (videoRef.current) {
          setDuration(videoRef.current.duration);
        }
      };
      
      videoRef.current.addEventListener('loadeddata', onDurationAvailable);
      videoRef.current.addEventListener('canplay', onDurationAvailable);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', onDurationAvailable);
          videoRef.current.removeEventListener('canplay', onDurationAvailable);
        }
      };
    }
  }, [videoRef.current]);
  
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
        recordAction('pause');
      } else {
        videoRef.current.play();
        recordAction('play');
      }
      setPlaying(!playing);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      // Update the component state to reflect the current video time
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      console.log('Video metadata loaded, duration:', videoRef.current.duration);
      setDuration(videoRef.current.duration);
    }
  };
  
  // Add additional event handler for duration change
  const handleDurationChange = () => {
    if (videoRef.current) {
      console.log('Video duration changed:', videoRef.current.duration);
      setDuration(videoRef.current.duration);
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

  // Expose the video element and annotation canvas to parent component
  React.useImperativeHandle(ref, () => ({
    video: videoRef.current,
    annotationCanvas: annotationCanvasRef.current
  }));

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
        <video
          ref={videoRef}
          className="w-full aspect-video"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          src={videoUrl}
          playsInline
          preload="metadata"
          muted
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
});

// Add displayName for better debugging in React DevTools
VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;