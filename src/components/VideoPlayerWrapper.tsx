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
import type { AudioChunk } from './AudioRecorder';
import ErrorBoundary from './ErrorBoundary';
const VideoPlayer = dynamic(() => import('./VideoPlayer'), { ssr: false });
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

const getCategoryLabel = (category: string): string => {
  return category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
};

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  try {
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Invalid base64 input: not a string or empty');
    }
    if (!mimeType || typeof mimeType !== 'string') {
      mimeType = 'audio/webm';
    }
    if (!base64.startsWith('data:')) {
      throw new Error('Invalid base64 string format - missing data: prefix');
    }
    if (!base64.includes(',')) {
      throw new Error('Invalid base64 string format - missing comma separator');
    }
    const base64Data = base64.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 string - no data after comma');
    }
    const headerPart = base64.split(',')[0];
    const mimeMatch = headerPart.match(/^data:(.*?)(;base64)?$/);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1];
    }
    try {
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType });
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
const prepareAudioChunksForSave = async (chunks: AudioChunk[]): Promise<any[]> => {
  if (!chunks || chunks.length === 0) {
    return [];
  }
  return Promise.all(chunks.map(async (chunk, index) => {
    try {
      if (chunk.blob instanceof Blob) {
        const base64 = await blobToBase64(chunk.blob);
        return {
          ...chunk,
          blob: base64,
          mimeType: chunk.mimeType || chunk.blob.type,
          url: undefined,
          blobUrl: chunk.blobUrl
        };
      } else if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
        const parts = chunk.blob.split(',');
        if (parts.length !== 2) {
          // Invalid data URL format
        }
        return {
          ...chunk,
          mimeType: chunk.mimeType || 'audio/webm',
          url: undefined,
          blobUrl: chunk.blobUrl
        };
      } else {
        return {
          ...chunk,
          blob: typeof chunk.blob === 'string' ? chunk.blob : '',
          mimeType: chunk.mimeType || 'audio/webm',
          url: undefined,
          blobUrl: chunk.blobUrl
        };
      }
    } catch (error) {
      return null;
    }
  })).then(results => {
    const validResults = results.filter(Boolean);
    return validResults;
  });
};
const restoreAudioChunks = (savedChunks: any[]): AudioChunk[] => {
  if (!savedChunks || savedChunks.length === 0) {
    return [];
  }
  return savedChunks.map((savedChunk, index) => {
    try {
      if (savedChunk.blob instanceof Blob) {
        return savedChunk;
      }
      if (typeof savedChunk.blob === 'string') {
        if (savedChunk.blob.startsWith('data:')) {
          try {
            const dataUrlParts = savedChunk.blob.split(',');
            if (dataUrlParts.length !== 2) {
              // Invalid data URL format
            }
            const mimeMatch = dataUrlParts[0].match(/:(.*?);/);
            if (!mimeMatch) {
              // Missing MIME type in data URL
            }
          } catch (validationError) {
            // Data URL validation error
          }
          return {
            ...savedChunk,
            blob: savedChunk.blob,
            mimeType: savedChunk.mimeType || 'audio/webm',
            startTime: savedChunk.startTime || 0,
            duration: savedChunk.duration || 0,
            videoTime: savedChunk.videoTime || 0,
            blobUrl: savedChunk.blobUrl
          };
        }
      }
      return {
        ...savedChunk,
        blob: savedChunk.blob || '',
        mimeType: savedChunk.mimeType || 'audio/webm',
        startTime: savedChunk.startTime || 0,
        duration: savedChunk.duration || 0,
        videoTime: savedChunk.videoTime || 0,
        blobUrl: savedChunk.blobUrl
      };
    } catch (error) {
      return null;
    }
  }).filter(Boolean as any);
};
const convertLegacyDataToSession = (legacyData: FeedbackData): FeedbackSession => {
  const audioTrack: AudioTrack = {
    chunks: legacyData.audioChunks || [],
    totalDuration: legacyData.audioChunks?.reduce((total, chunk) => total + chunk.duration, 0) || 0
  };
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
const convertSessionToLegacyData = (session: FeedbackSession): FeedbackData => {
  const legacyData: FeedbackData = {
    sessionId: session.id,
    videoId: session.videoId,
    startTime: session.startTime,
    endTime: session.endTime,
    actions: [],
    audioChunks: session.audioTrack.chunks,
    annotations: []
  };
  const annotations: DrawingPath[] = [];
  session.events.forEach(event => {
    if (event.type === 'video') {
      const action: RecordedAction = {
        type: event.payload.action,
        timestamp: event.timeOffset,
        videoTime: 0,
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
        videoTime: 0,
        details: event.payload.action === 'clear'
          ? { clear: true }
          : { path: event.payload.path }
      };
      legacyData.actions.push(action);
      if (event.payload.action === 'draw' && event.payload.path) {
        const pathWithTiming = {
          ...event.payload.path,
          timeOffset: event.timeOffset,
          globalTimeOffset: event.timeOffset,
          videoTime: event.timeOffset,
          tool: event.payload.path.tool || 'freehand'
        };
        annotations.push(pathWithTiming);
      }
    }
    else if (event.type === 'marker') {
    }
  });
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
  contentToReview?: any;
  initialSession?: any;
  onSessionComplete?: (session: FeedbackSession) => void;
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
  let videoContext;
  try {
    videoContext = useVideo();
  } catch (error) {
    videoContext = { setVideoUrl: () => {}, state: {} };
  }
  const prevUrlRef = useRef(videoUrl);
  useEffect(() => {
    if (videoUrl && videoUrl !== prevUrlRef.current) {
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const orchestratorVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orchestratorRef = useRef<any>(null);
  const annotationCanvasComponentRef = useRef<any>(null);
  const setVideoElementRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      orchestratorVideoRef.current = el;
    }
  }, []);
  const startRecording = useCallback(() => {
    setMode('record');
    if (annotationCanvasComponentRef.current) {
      if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
        annotationCanvasComponentRef.current.clearCanvasDrawings();
      }
    }
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    if (orchestratorRef.current) {
      orchestratorRef.current.startRecordingSession();
      setIsActive(true);
    }
  }, []);
  const stopRecording = useCallback(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.endRecordingSession();
      setIsActive(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        if (!videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
      if (annotationCanvasComponentRef.current) {
        if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
          annotationCanvasComponentRef.current.clearCanvasDrawings();
        }
      }
      if (onCategoriesCleared) {
        onCategoriesCleared();
      }
      if (typeof window !== 'undefined') {
        window.__hasRecordedSession = true;
        window.dispatchEvent(new Event('session-available'));
      }
    }
  }, [onCategoriesCleared, currentSession]);
  const startReplay = useCallback(() => {
    if (annotationCanvasComponentRef.current && annotationCanvasComponentRef.current.clearCanvasDrawings) {
      annotationCanvasComponentRef.current.clearCanvasDrawings();
    }
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
    if (orchestratorRef.current && currentSession) {
      if (onCategoriesCleared) {
        onCategoriesCleared();
      }
      if (typeof window !== 'undefined' && !window.__sessionReady) {
        orchestratorRef.current.loadSession(currentSession);
      }
      try {
        setMode('replay');
        setIsActive(true);
        setTimeout(() => {
          if (orchestratorRef.current) {
            orchestratorRef.current.startReplay();
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
  const stopReplay = useCallback(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.stopReplay();
      setIsActive(false);
      setMode('record');
      if (onReplayModeChange) {
        onReplayModeChange(false);
      }
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        if (!videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
      if (annotationCanvasComponentRef.current) {
        if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
          annotationCanvasComponentRef.current.clearCanvasDrawings();
        }
      }
      if (typeof window !== 'undefined') {
        window.__isReplaying = false;
      }
    }
  }, [onReplayModeChange]);
  const handleSessionComplete = useCallback((session: FeedbackSession) => {
    const sessionCopy = JSON.parse(JSON.stringify(session));
    const categoriesCopy = JSON.parse(JSON.stringify(categories));
    const selectedCategories = Object.entries(categoriesCopy)
      .filter(([_, value]) => value)
      .map(([key]) => key);
    const sessionWithCategories = {
      ...sessionCopy,
      categories: categoriesCopy
    };
    setCurrentSession(sessionWithCategories);
    const legacyData = convertSessionToLegacyData(sessionWithCategories);
    setFeedbackData(legacyData);
    if (typeof window !== 'undefined') {
      window.__hasRecordedSession = true;
      window.dispatchEvent(new Event('session-available'));
    }
    if (onSessionComplete) {
      onSessionComplete(sessionWithCategories);
    }
  }, [categories, onSessionComplete]);
  const handleAudioRecorded = useCallback((audioTrack: AudioTrack) => {
  }, []);
  const drawAnnotation = useCallback((path: DrawingPath) => {
    if (videoRef.current && !path.videoTime) {
      path.videoTime = videoRef.current.currentTime * 1000;
    }
    if (annotationCanvasComponentRef.current) {
      try {
        annotationCanvasComponentRef.current.handleManualAnnotation(path);
      } catch (error) {
      }
    } else {
    }
  }, []);
  const clearAnnotations = useCallback(() => {
    if (annotationCanvasComponentRef.current) {
      try {
        if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
          annotationCanvasComponentRef.current.clearCanvasDrawings();
        } else {
        }
      } catch (error) {
      }
    } else {
    }
  }, []);
  const downloadSessionData = useCallback(async () => {
    if (!currentSession) {
      alert('No recorded session to download.');
      return;
    }
    try {
      const sessionCopy = JSON.parse(JSON.stringify(currentSession));
      const categoriesCopy = JSON.parse(JSON.stringify(categories));
      const selectedCategories = Object.entries(categoriesCopy)
        .filter(([_, value]) => value)
        .map(([key]) => key);
      sessionCopy.categories = categoriesCopy;
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
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        if (jsonData.events && jsonData.audioTrack) {
          const loadedSession = jsonData as FeedbackSession;
          if (loadedSession.audioTrack && loadedSession.audioTrack.chunks) {
            loadedSession.audioTrack.chunks = restoreAudioChunks(loadedSession.audioTrack.chunks);
          }
          setCurrentSession(loadedSession);
          setFeedbackData(convertSessionToLegacyData(loadedSession));
        } else {
          const legacyData = jsonData as FeedbackData;
          if (legacyData.audioChunks) {
            legacyData.audioChunks = restoreAudioChunks(legacyData.audioChunks);
          }
          setFeedbackData(legacyData);
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
  const getOrchestratorRef = useCallback((orchestratorInstance: any) => {
    orchestratorRef.current = orchestratorInstance;
  }, []);
  const recordCategoryChange = useCallback((category: string, rating: number) => {
    if (orchestratorRef.current) {
      if (!isActive && mode === 'record') {
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
      orchestratorRef.current.handleCategoryEvent(category, rating);
    } else {
    }
  }, [mode, isActive, currentSession, videoId]);
  const getVideoPlayerRef = useCallback((videoPlayerInstance: any) => {
    annotationCanvasComponentRef.current = videoPlayerInstance?.annotationCanvas;
  }, []);
  useEffect(() => {
    if (orchestratorRef.current && mode === 'replay' && isActive) {
      const progress = orchestratorRef.current.replayProgress;
      if (progress === 100) {
        setIsActive(false);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          if (!videoRef.current.paused) {
            videoRef.current.pause();
          }
        }
        if (annotationCanvasComponentRef.current) {
          if (annotationCanvasComponentRef.current.clearCanvasDrawings) {
            annotationCanvasComponentRef.current.clearCanvasDrawings();
          }
        }
      }
    }
  }, [mode, isActive, orchestratorRef.current?.replayProgress]);
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
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__videoPlayerWrapper = {
        recordCategoryChange,
        isRecording: mode === 'record' && isActive,
        startReplay,
        stopReplay,
        resetState: () => {
          setMode('record');
          setIsActive(false);
          if (onReplayModeChange) {
            onReplayModeChange(false);
          }
          if (typeof window !== 'undefined') {
            window.__isReplaying = false;
          }
        }
      };
      window.__hasRecordedSession = currentSession !== null;
    }
    if (onReplayModeChange) {
      const isReplay = mode === 'replay';
      onReplayModeChange(isReplay);
    }
    return () => {
      if (typeof window !== 'undefined' && window.__videoPlayerWrapper) {
        delete window.__videoPlayerWrapper;
      }
    };
  }, [recordCategoryChange, mode, isActive, onReplayModeChange, currentSession]);
  useEffect(() => {
    if (initialSession && !isActive && mode === 'record') {
      setTimeout(() => {
        if (orchestratorRef.current) {
          setCurrentSession(initialSession);
          orchestratorRef.current.loadSession(initialSession);
          if (typeof window !== 'undefined' && !window.__isCompletedVideo) {
            setMode('replay');
            orchestratorRef.current.startReplay();
            setIsActive(true);
          } else {
            if (typeof window !== 'undefined') {
              window.__sessionReady = true;
              window.dispatchEvent(new Event('session-ready'));
            }
          }
        }
      }, 1500);
    }
  }, [initialSession]);
  let contextVideoUrl;
  try {
    const videoSource = useVideoSource();
    contextVideoUrl = videoSource?.effectiveUrl;
  } catch (error) {
    contextVideoUrl = videoUrl;
  }
  useEffect(() => {
  }, [contextVideoUrl]);
  return (
    <div className="w-full">
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
        <div className="relative">
          <ErrorBoundary
            fallback={
              <div className="flex flex-col items-center justify-center bg-red-50 p-8 rounded-lg border border-red-200 text-center min-h-[300px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-medium text-red-800 mb-2">Video Player Error</h3>
                <p className="text-sm text-red-600 mb-4">There was a problem loading the video player.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            }
            onError={(error) => {
              console.error("Video player error:", error);
              // You could send this error to a monitoring service
            }}
          >
            <VideoPlayer
              ref={getVideoPlayerRef}
              isRecording={mode === 'record' && isActive}
              isReplaying={mode === 'replay' && isActive}
              setVideoRef={setVideoElementRef}
              replayAnnotations={currentSession?.events
                ?.filter(e => e.type === 'annotation' && e.payload?.action === 'draw' && e.payload?.path)
                ?.map(e => {
                  const tool = e.payload.path.tool || 'freehand';
                  return {
                    ...e.payload.path,
                    timeOffset: e.timeOffset,
                    globalTimeOffset: e.timeOffset,
                    videoTime: e.timeOffset,
                    tool: tool
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
                if (orchestratorRef.current && mode === 'record' && isActive) {
                  orchestratorRef.current.handleAnnotationEvent('draw', annotation);
                }
              }}
              isCompletedVideo={typeof window !== 'undefined' && window.__isCompletedVideo === true}
              hasRecordedSession={typeof window !== 'undefined' && window.__hasRecordedSession === true}
            />
          </ErrorBoundary>
          <ErrorBoundary
            fallback={
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                <h3 className="text-md font-medium text-yellow-800 mb-2">Feedback System Error</h3>
                <p className="text-sm text-yellow-700">There was a problem with the feedback system. Your video should still work, but recording and playback features may be limited.</p>
              </div>
            }
            onError={(error) => {
              console.error("Feedback orchestrator error:", error);
            }}
          >
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
                if (loadedCategories) {
                  if (onCategoriesCleared) {
                    onCategoriesCleared();
                  }
                  const hasCheckedCategories = Object.values(loadedCategories).some(isChecked => isChecked);
                  if (hasCheckedCategories && onCategoriesLoaded) {
                    setTimeout(() => {
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
          </ErrorBoundary>
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
              {currentSession.events.map((event) => (
                <li key={event.id} className="mb-1 p-2 border-b">
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