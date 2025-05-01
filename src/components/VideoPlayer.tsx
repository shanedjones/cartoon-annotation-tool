'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDrawingTools } from '../contexts/DrawingToolsContext';
import { useRecording } from '../contexts/RecordingContext';
import type { DrawingPath, DrawingTool } from '../types';
import AnnotationCanvas from './AnnotationCanvas';
export type ActionType = 'play' | 'pause' | 'seek' | 'playbackRate' | 'keyboardShortcut' | 'annotation' | 'audio';
export interface RecordedAction {
  type: ActionType;
  timestamp: number;
  videoTime: number;
  details?: {
    [key: string]: any;
  };
}
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
  setVideoRef?: (ref: HTMLVideoElement | null) => void;
  videoUrl?: string;
  onLoadingStateChange?: (isLoading: boolean) => void;
}
interface VideoPlayerImperativeHandle {
  video: HTMLVideoElement | null;
  annotationCanvas: any;
}
const VideoPlayer = React.memo(React.forwardRef<VideoPlayerImperativeHandle, VideoPlayerProps>(({
  setVideoRef,
  videoUrl = "",
  onLoadingStateChange
}: VideoPlayerProps, ref) => {
  const { state: drawingState, clearCanvas } = useDrawingTools();
  const { 
    state: recordingState, 
    onRecordAction, 
    onAnnotationAdded 
  } = useRecording();
  
  const { 
    isRecording, 
    isReplaying, 
    replayAnnotations, 
    isCompletedVideo, 
    hasRecordedSession 
  } = recordingState;
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isVideoCached, setIsVideoCached] = useState(false);
  const [cachedVideoSrc, setCachedVideoSrc] = useState<string | undefined>(undefined);
  const [isLoadStarted, setIsLoadStarted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const annotationCanvasRef = useRef<any>(null);
  const localBlobCache = useRef<Record<string, string>>({});
  useEffect(() => {
    if (isRecording && !recordingStartTimeRef.current) {
      recordingStartTimeRef.current = Date.now();
    } else if (!isRecording) {
      recordingStartTimeRef.current = null;
    }
  }, [isRecording]);
  useEffect(() => {
    if (isReplaying && videoRef.current) {
      videoRef.current.play()
        .then(() => {
          setPlaying(true);
        })
        .catch(err => {
        });
    }
  }, [isReplaying]);
  const prevUrlRef = useRef(videoUrl);
  useEffect(() => {
    // Use a direct URL to a known working video
    const actualVideoUrl = videoUrl || 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    
    if (prevUrlRef.current !== actualVideoUrl) {
      setIsLoadStarted(false);
      prevUrlRef.current = actualVideoUrl;
    }
    
    if (!isLoadStarted) {
      setIsLoading(true);
      setIsLoadStarted(true);
      setHasError(false);
      setErrorMessage('');
      setCachedVideoSrc(actualVideoUrl);
    }
  }, [videoUrl, isLoadStarted]);
  useEffect(() => {
    if (!videoRef.current) return;
    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Failed to load the video. Please try again or contact support.');
    };
    videoRef.current.addEventListener('error', handleError);
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('error', handleError);
      }
    };
  }, [videoRef.current]);
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
  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(isLoading);
    }
  }, [isLoading, onLoadingStateChange]);
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
    if (videoRef.current) {
      if (videoRef.current.readyState >= 1) {
        updateVideoDimensions();
      } else {
        videoRef.current.addEventListener('loadedmetadata', updateVideoDimensions);
      }
    }
    window.addEventListener('resize', updateVideoDimensions);
    return () => {
      window.removeEventListener('resize', updateVideoDimensions);
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', updateVideoDimensions);
      }
    };
  }, [videoRef.current]);
  const handleAnnotationAdded = (path: DrawingPath) => {
    const globalTimeOffset = isRecording && recordingStartTimeRef.current ?
      Date.now() - recordingStartTimeRef.current : 0;
    const annotationWithTiming = {
      ...path,
      videoTime: currentTime * 1000,
      globalTimeOffset: globalTimeOffset,
      tool: path.tool || 'freehand'
    };
    if (isRecording && onAnnotationAdded) {
      onAnnotationAdded(annotationWithTiming);
    }
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
  const clearAnnotations = () => {
    clearCanvas();
    if (isRecording && recordingStartTimeRef.current && onRecordAction) {
      const globalTimeOffset = Date.now() - recordingStartTimeRef.current;
      const action: RecordedAction = {
        type: 'annotation',
        timestamp: globalTimeOffset,
        videoTime: currentTime,
        details: {
          action: 'clear',
          clear: true,
          globalTimeOffset: globalTimeOffset
        }
      };
      onRecordAction(action);
    }
  };
  const recordAction = (type: ActionType, details?: {[key: string]: any}) => {
    if (isRecording && recordingStartTimeRef.current && onRecordAction) {
      const globalTimeOffset = Date.now() - recordingStartTimeRef.current;
      const action: RecordedAction = {
        type,
        timestamp: globalTimeOffset,
        videoTime: currentTime,
        details: {
          ...details,
          globalTimeOffset: globalTimeOffset
        }
      };
      onRecordAction(action);
    }
  };
  const togglePlay = useCallback(() => {
    if (isReplaying) return;
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
  }, [isReplaying, videoRef, playing, recordAction]);
  const timeUpdateRef = useRef<number | null>(null);
  useEffect(() => {
    const updateTimeDisplay = () => {
      if (videoRef.current) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
      }
      timeUpdateRef.current = requestAnimationFrame(updateTimeDisplay);
    };
    timeUpdateRef.current = requestAnimationFrame(updateTimeDisplay);
    return () => {
      if (timeUpdateRef.current !== null) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
    };
  }, []);
  const handleTimeUpdate = () => {
  };
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setDuration(duration);
    }
  };
  const handleCanPlayThrough = () => {
    setTimeout(() => {
      setIsLoading(false);
      setIsVideoCached(true);
      setHasError(false);
      setErrorMessage('');
    }, 250);
  };
  const handleDurationChange = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setDuration(duration);
    }
  };
  const seekToTime = useCallback((time: number) => {
    if (videoRef.current) {
      const previousTime = videoRef.current.currentTime;
      const newTime = Math.max(0, Math.min(duration, time));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      return { previousTime, newTime };
    }
    return null;
  }, [duration, videoRef]);
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const result = seekToTime(time);
    if (result) {
      recordAction('seek', { from: result.previousTime, to: result.newTime });
    }
  }, [seekToTime, recordAction]);
  
  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    const element = e.target as HTMLInputElement;
    const rect = element.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = offsetX / rect.width;
    const time = percentage * duration;
    const result = seekToTime(time);
    if (result) {
      recordAction('seek', { from: result.previousTime, to: result.newTime });
    }
  }, [duration, seekToTime, recordAction]);
  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (videoRef.current) {
      const previousRate = videoRef.current.playbackRate;
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      recordAction('playbackRate', { from: previousRate, to: rate });
    }
  }, [videoRef, recordAction]);
  const formatTime = useCallback((time: number) => {
    if (!time || isNaN(time) || time < 0) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReplaying) return;
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duration, playing, isRecording, isReplaying, currentTime]);
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
  React.useImperativeHandle(ref, () => ({
    video: videoRef.current,
    annotationCanvas: annotationCanvasRef.current,
    handleManualAnnotation: (path: DrawingPath) => {
      if (annotationCanvasRef.current) {
        annotationCanvasRef.current.handleManualAnnotation(path);
        if (isRecording && onRecordAction) {
          const action: RecordedAction = {
            type: 'annotation',
            timestamp: Date.now() - (recordingStartTimeRef.current || 0),
            videoTime: currentTime,
            details: { path }
          };
          onRecordAction(action);
        }
      }
    },
    clearAllAnnotations: () => {
      if (annotationCanvasRef.current) {
        annotationCanvasRef.current.clearCanvasDrawings();
        if (isRecording && onRecordAction) {
          const globalTimeOffset = Date.now() - (recordingStartTimeRef.current || 0);
          const action: RecordedAction = {
            type: 'annotation',
            timestamp: globalTimeOffset,
            videoTime: currentTime,
            details: {
              action: 'clear',
              clear: true,
              globalTimeOffset: globalTimeOffset
            }
          };
          onRecordAction(action);
        }
      }
    }
  }));
  return (
    <div className="flex flex-col w-full max-w-5xl bg-gray-100 rounded-lg shadow-md overflow-hidden">
      {!isReplaying && !(isCompletedVideo || hasRecordedSession) && (
        <div className="p-3 bg-white border-b border-gray-200">
          <div className="flex flex-wrap items-center space-x-3">
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Tool:</label>
              <select
                value={drawingState.toolType}
                onChange={(e) => {
                  const { setToolType } = useDrawingTools();
                  setToolType(e.target.value as DrawingTool);
                }}
                className="bg-gray-100 text-xs rounded p-1 border border-gray-300"
              >
                <option value="line">Line</option>
                <option value="freehand">Pen</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Color:</label>
              <select
                value={drawingState.toolColor}
                onChange={(e) => {
                  const { setToolColor } = useDrawingTools();
                  setToolColor(e.target.value);
                }}
                className="bg-gray-100 text-xs rounded p-1 border border-gray-300"
              >
                <option value="#ffff00">Yellow</option>
                <option value="#ff0000">Red</option>
                <option value="#0000ff">Blue</option>
                <option value="#00ff00">Green</option>
                <option value="#000000">Black</option>
                <option value="#ffffff">White</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-600">Width:</label>
              <select
                value={drawingState.toolWidth}
                onChange={(e) => {
                  const { setToolWidth } = useDrawingTools();
                  setToolWidth(parseInt(e.target.value));
                }}
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
            >
              Clear
            </button>
          </div>
        </div>
      )}
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
            <p className="text-white text-sm mt-1">{isVideoCached ? 'Video will be cached for future viewing' : 'Please wait while the video loads, this can take a few minutes...'}</p>
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
          onCanPlayThrough={handleCanPlayThrough}
          onError={(e) => {
            setIsLoading(false);
            setHasError(true);
            setErrorMessage('Failed to load the video. Using backup source.');
            // Fallback to a guaranteed working video
            setCachedVideoSrc('https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
          }}
          playsInline
          preload="metadata"
          muted
          controls
        >
          <source src={cachedVideoSrc} type="video/mp4" />
          <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {videoDimensions.width > 0 && videoDimensions.height > 0 && (
          <AnnotationCanvas
            ref={annotationCanvasRef}
            width={videoDimensions.width}
            height={videoDimensions.height}
            currentTime={currentTime}
            isRecording={isRecording}
            isReplaying={isReplaying}
            onAnnotationAdded={handleAnnotationAdded}
            replayAnnotations={replayAnnotations}
          />
        )}
      </div>
      {!isReplaying && !(isCompletedVideo || hasRecordedSession) ? (
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
                        focus:outline-none focus:ring-1 focus:ring-blue-300
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:opacity-0
                        [&::-moz-range-thumb]:opacity-0
                        [&::-ms-thumb]:opacity-0
                        transition-all duration-100"
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
        </div>
      ) : (
        <div className="p-2 bg-white">
          <div className="flex justify-center">
            <span className="text-sm text-gray-600">
              {formatTime(currentTime)} / {duration ? formatTime(duration) : '0:00'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}));
VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;