'use client';
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTimeline, useLastClearTime } from '../contexts/TimelineContext';
import type { AudioChunk } from './AudioRecorder';
import type { DrawingPath } from '../types';
import type { RecordedAction } from './VideoPlayer';
export interface FeedbackSession {
  id: string;
  videoId: string;
  startTime: number;
  endTime?: number;
  audioTrack: AudioTrack;
  events: TimelineEvent[];
  categories?: Record<string, number | boolean>;
}
export interface AudioTrack {
  chunks: AudioChunk[];
  totalDuration: number;
}
export interface TimelineEvent {
  id: string;
  type: 'video' | 'annotation' | 'marker' | 'category';
  timeOffset: number;
  duration?: number;
  payload: any;
  priority?: number;
}
interface FeedbackOrchestratorProps {
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<any>;
  drawAnnotation: (path: DrawingPath) => void;
  clearAnnotations: () => void;
  onAudioRecorded: (audioTrack: AudioTrack) => void;
  onSessionComplete: (session: FeedbackSession) => void;
  initialSession?: FeedbackSession | null;
  mode: 'record' | 'replay';
  onCategoriesLoaded?: (categories: Record<string, number | boolean>) => void;
}
const FeedbackOrchestrator = forwardRef<any, FeedbackOrchestratorProps>(({
  videoElementRef,
  canvasRef,
  drawAnnotation,
  clearAnnotations,
  onAudioRecorded,
  onSessionComplete,
  initialSession,
  mode,
  onCategoriesLoaded
}, ref) => {
  const [isActive, setIsActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<FeedbackSession | null>(initialSession || null);
  const [replayProgress, setReplayProgress] = useState(0);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const { updatePosition, resetTimelinePosition } = useTimeline();
  const { updateClearTime } = useLastClearTime();
  const recordingStartTimeRef = useRef<number | null>(null);
  const audioChunksRef = useRef<AudioChunk[]>([]);
  const eventsRef = useRef<TimelineEvent[]>([]);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingEventsRef = useRef<TimelineEvent[]>([]);
  const replayTimeoutIdsRef = useRef<number[]>([]);
  const [executeEvent] = useState(() => (event: TimelineEvent) => {
    switch (event.type) {
      case 'video':
        if (videoElementRef.current) {
          const video = videoElementRef.current;
          const payload = event.payload;
          switch (payload.action) {
            case 'play':
              video.play().catch(() => {});
              break;
            case 'pause':
              video.pause();
              break;
            case 'seek':
              if (payload.to !== undefined) {
                video.currentTime = payload.to;
              }
              break;
            case 'playbackRate':
              if (payload.to !== undefined) {
                video.playbackRate = payload.to;
              }
              break;
            case 'keyboardShortcut':
              if (payload.action === 'forward' && payload.to !== undefined) {
                video.currentTime = payload.to;
              } else if (payload.action === 'rewind' && payload.to !== undefined) {
                video.currentTime = payload.to;
              } else if (payload.action === 'play') {
                video.play().catch(() => {});
              } else if (payload.action === 'pause') {
                video.pause();
              }
              break;
          }
        }
        break;
      case 'annotation':
        if (drawAnnotation && clearAnnotations) {
          const payload = event.payload;
          switch (payload.action) {
            case 'draw':
              if (payload.path) {
                try {
                  const pathWithTiming = {
                    ...payload.path,
                    timeOffset: event.timeOffset,
                    globalTimeOffset: event.timeOffset,
                    videoTime: event.timeOffset
                  };
                  drawAnnotation(pathWithTiming);
                } catch (error) {
                  // Silently handle errors
                }
              }
              break;
            case 'clear':
              try {
                updateClearTime(event.timeOffset);
                clearAnnotations();
              } catch (error) {
                // Silently handle errors
              }
              break;
          }
        }
        break;
      case 'marker':
      case 'category':
        // No actions for marker and category events in executeEvent
        break;
    }
  });
  const assignEventPriority = useCallback((event: TimelineEvent): number => {
    if (event.priority !== undefined) return event.priority;
    switch (event.type) {
      case 'video': return 1;
      case 'annotation': return 2;
      case 'marker': return 3;
      case 'category': return 4;
      default: return 10;
    }
  }, []);
  const processPendingEvents = useCallback((currentTimeMs: number) => {
    if (pendingEventsRef.current.length === 0) return;
    const eventsToExecute: TimelineEvent[] = [];
    const remainingEvents: TimelineEvent[] = [];
    pendingEventsRef.current.forEach(event => {
      if (event.timeOffset <= currentTimeMs) {
        eventsToExecute.push(event);
      } else {
        remainingEvents.push(event);
      }
    });
    pendingEventsRef.current = remainingEvents;
    if (eventsToExecute.length === 0) return;
    eventsToExecute.sort((a, b) => {
      if (a.timeOffset !== b.timeOffset) {
        return a.timeOffset - b.timeOffset;
      }
      return assignEventPriority(a) - assignEventPriority(b);
    });
    requestAnimationFrame(() => {
      Promise.resolve().then(() => {
        eventsToExecute.forEach(event => {
          if (event.type === 'category') {
            requestAnimationFrame(() => {
              executeEvent(event);
            });
          } else {
            executeEvent(event);
          }
        });
      });
    });
  }, [assignEventPriority, executeEvent]);
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }, []);
  const startRecordingSession = useCallback(async () => {
    if (isActive) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        }
      });
      streamRef.current = stream;
      let mimeType = '';
      const formats = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav'
      ];
      for (const format of formats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          break;
        }
      }
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000
      });
      audioRecorderRef.current = recorder;
      const chunks: Blob[] = [];
      audioChunksRef.current = [];
      eventsRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      recorder.onstop = async () => {
        if (chunks.length === 0) return;
        const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        const recordingEndTime = Date.now();
        const startTime = recordingStartTimeRef.current || 0;
        const duration = recordingEndTime - startTime;
        const sessionId = generateId();
        let blobUrl: string | undefined;
        try {
          const { uploadAudioToStorage } = await import('../utils/audioStorage');
          if (audioBlob && audioBlob.size > 0) {
            blobUrl = await uploadAudioToStorage(audioBlob, sessionId);
          } else {
          }
        } catch (error) {
        }
        const audioChunk: AudioChunk = {
          blob: audioBlob,
          startTime: startTime,
          duration: duration,
          videoTime: 0,
          mimeType: mimeType || 'audio/webm',
          blobUrl: blobUrl
        };
        audioChunksRef.current = [audioChunk];
        const audioTrack: AudioTrack = {
          chunks: audioChunksRef.current,
          totalDuration: duration
        };
        const currentSessionData = currentSession || { categories: {} };
        const categories: Record<string, number> = {};
        if (currentSessionData.categories) {
          const cats = currentSessionData.categories as Record<string, number | boolean>;
          Object.keys(cats).forEach(key => {
            const value = cats[key];
            if (typeof value === 'number' && value > 0) {
              categories[key] = value;
            } else if (typeof value === 'boolean' && value) {
              categories[key] = 1;
            }
          });
        }
        const session: FeedbackSession = {
          id: sessionId,
          videoId: 'video-' + generateId(),
          startTime: startTime,
          endTime: recordingEndTime,
          audioTrack: audioTrack,
          events: eventsRef.current,
          categories: categories
        };
        setCurrentSession(session);
        onAudioRecorded(audioTrack);
        onSessionComplete(session);
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };
      const startTime = Date.now();
      recordingStartTimeRef.current = startTime;
      recorder.start();
      const newSession: FeedbackSession = {
        id: generateId(),
        videoId: 'video-' + generateId(),
        startTime: startTime,
        audioTrack: { chunks: [], totalDuration: 0 },
        events: [],
        categories: {}
      };
      setCurrentSession(newSession);
      setIsActive(true);
    } catch (error) {
      alert(`Could not start recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [isActive, generateId, onAudioRecorded, onSessionComplete]);
  const endRecordingSession = useCallback(() => {
    if (!isActive) return;
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    recordingStartTimeRef.current = null;
  }, [isActive]);
  const recordEvent = useCallback((type: 'video' | 'annotation' | 'marker', payload: any, duration?: number) => {
    if (!isActive || !recordingStartTimeRef.current) return;
    const now = Date.now();
    const timeOffset = now - recordingStartTimeRef.current;
    let priority: number;
    switch (type) {
      case 'video': priority = 1; break;
      case 'annotation': priority = 2; break;
      case 'marker': priority = 3; break;
      default: priority = 10; break;
    }
    const event: TimelineEvent = {
      id: generateId(),
      type,
      timeOffset,
      duration,
      payload,
      priority
    };
    eventsRef.current.push(event);
    return event;
  }, [isActive, generateId]);
  const handleVideoEvent = useCallback((action: string, details?: any) => {
    return recordEvent('video', { action, ...details });
  }, [recordEvent]);
  const handleAnnotationEvent = useCallback((action: string, path?: DrawingPath) => {
    const event = recordEvent('annotation', { action, path });
    return event;
  }, [recordEvent]);
  const addMarker = useCallback((text: string) => {
    return recordEvent('marker', { text });
  }, [recordEvent]);
  const handleCategoryEvent = useCallback((category: string, rating: number) => {
    setCurrentSession(prevSession => {
      if (!prevSession) {
        return {
          id: generateId(),
          videoId: 'unknown',
          startTime: recordingStartTimeRef.current || Date.now(),
          events: [],
          audioTrack: { chunks: [], totalDuration: 0 },
          categories: { [category]: rating }
        };
      }
      const currentCategories = prevSession.categories || {};
      const updatedCategories = {
        ...currentCategories,
        [category]: rating > 0 ? rating : false
      };
      return {
        ...prevSession,
        categories: updatedCategories
      };
    });
    const event = {
      id: generateId(),
      type: 'category' as const,
      timeOffset: Date.now() - (recordingStartTimeRef.current || Date.now()),
      payload: { category, rating },
      priority: 4
    };
    if (isActive && recordingStartTimeRef.current) {
      eventsRef.current.push(event);
    }
  }, [generateId, currentSession, isActive]);
  const completeReplay = useCallback(() => {
    resetTimelinePosition();
    if (audioPlayer) {
      audioPlayer.pause();
      const isLocalBlob = audioPlayer.dataset.isLocalBlob === 'true';
      if (isLocalBlob && audioPlayer.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioPlayer.src);
      }
      setAudioPlayer(null);
    }
    replayTimeoutIdsRef.current.forEach(id => window.clearTimeout(id));
    replayTimeoutIdsRef.current = [];
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = 0;
      if (!videoElementRef.current.paused) {
        videoElementRef.current.pause();
      }
    }
    try {
      if (canvasRef.current && canvasRef.current.resetCanvas) {
        canvasRef.current.resetCanvas();
      } else {
        clearAnnotations();
      }
    } catch (error) {
      // Silently handle errors
    }
    pendingEventsRef.current = [];
    setIsActive(false);
    setReplayProgress(100);
    if (typeof window !== 'undefined') {
      window.__isReplaying = false;
    }
    setTimeout(() => {
      setReplayProgress(0);
      if (typeof window !== 'undefined' && window.__videoPlayerWrapper && window.__videoPlayerWrapper.resetState) {
        window.__videoPlayerWrapper.resetState();
      }
    }, 1500);
  }, [audioPlayer, videoElementRef, clearAnnotations, resetTimelinePosition]);
  const simulateTimelineWithoutAudio = useCallback((session: FeedbackSession) => {
    if (videoElementRef.current) {
      videoElementRef.current.pause();
    }
    const totalDuration = session.events.length > 0
      ? Math.max(...session.events.map(e => e.timeOffset)) + 5000
      : 30000;
    let elapsed = 0;
    const interval = 100;
    const timelineInterval = window.setInterval(() => {
      elapsed += interval;
      setReplayProgress((elapsed / totalDuration) * 100);
      requestAnimationFrame(() => {
        updatePosition(elapsed);
        Promise.resolve().then(() => {
          processPendingEvents(elapsed);
        });
        if (elapsed >= totalDuration) {
          clearInterval(timelineInterval);
          completeReplay();
          setIsActive(false);
        }
      });
    }, interval);
    replayTimeoutIdsRef.current.push(timelineInterval as unknown as number);
  }, [updatePosition, processPendingEvents, completeReplay]);
  const startReplay = useCallback(() => {
    if (!currentSession || isActive) return;
    resetTimelinePosition();
    if (videoElementRef.current) {
      videoElementRef.current.pause();
      videoElementRef.current.currentTime = 0;
    }
    setIsActive(true);
    setReplayProgress(0);
    replayTimeoutIdsRef.current.forEach(id => window.clearTimeout(id));
    replayTimeoutIdsRef.current = [];
    pendingEventsRef.current = [];
    pendingEventsRef.current = [...currentSession.events].sort((a, b) => {
      if (a.timeOffset !== b.timeOffset) {
        return a.timeOffset - b.timeOffset;
      }
      const priorityA = a.priority ?? (a.type === 'video' ? 1 :
                        a.type === 'annotation' ? 2 :
                        a.type === 'marker' ? 3 :
                        a.type === 'category' ? 4 : 10);
      const priorityB = b.priority ?? (b.type === 'video' ? 1 :
                        b.type === 'annotation' ? 2 :
                        b.type === 'marker' ? 3 :
                        b.type === 'category' ? 4 : 10);
      return priorityA - priorityB;
    });
    if (currentSession.audioTrack.chunks.length > 0) {
      const mainAudioChunk = currentSession.audioTrack.chunks[0];
      try {
        let audioUrl: string;
        let isLocalBlob = false;
        if (mainAudioChunk.blobUrl) {
          audioUrl = mainAudioChunk.blobUrl;
        }
        else if (mainAudioChunk.blob instanceof Blob) {
          audioUrl = URL.createObjectURL(mainAudioChunk.blob);
          isLocalBlob = true;
        } else if (typeof mainAudioChunk.blob === 'string' && mainAudioChunk.blob.startsWith('data:')) {
          const parts = mainAudioChunk.blob.split(',');
          if (parts.length !== 2) {
            throw new Error('Invalid data URL format');
          }
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : mainAudioChunk.mimeType || 'audio/webm';
          const binary = atob(parts[1]);
          const arrayBuffer = new ArrayBuffer(binary.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          for (let i = 0; i < binary.length; i++) {
            uint8Array[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([uint8Array], { type: mime });
          audioUrl = URL.createObjectURL(blob);
          isLocalBlob = true;
        } else if (!mainAudioChunk.blob) {
          return;
        } else {
          throw new Error('Unsupported audio format');
        }
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = audioUrl;
        audio.ontimeupdate = () => {
          const currentTime = audio.currentTime * 1000;
          const totalDuration = currentSession.audioTrack.totalDuration;
          setReplayProgress((currentTime / totalDuration) * 100);
          requestAnimationFrame(() => {
            updatePosition(currentTime);
            Promise.resolve().then(() => {
              processPendingEvents(currentTime);
            });
          });
        };
        audio.onended = () => {
          completeReplay();
          setIsActive(false);
        };
        audio.onerror = (e) => {
          const errorInfo = {
            code: audio.error ? audio.error.code : 'unknown',
            message: audio.error ? audio.error.message : 'No error details available',
            src: audioUrl.substring(0, 100) + '...',
            audioType: isLocalBlob ? 'local-blob' : (audioUrl.startsWith('/api') ? 'proxy-url' : 'azure-url'),
            readyState: audio.readyState,
            networkState: audio.networkState,
            error: audio.error
          };
          try {
            audio.pause();
            setTimeout(() => {
              audio.load();
              audio.play().catch(err => {
                completeReplay();
              });
            }, 1000);
          } catch (recoverError) {
            completeReplay();
          }
        };
        audio.dataset.isLocalBlob = isLocalBlob.toString();
        setAudioPlayer(audio);
        setTimeout(() => {
          if (audio.readyState >= 2) {
            audio.play().catch(error => {
              if (error.name === 'NotAllowedError') {
                alert('Audio playback requires user interaction. Please click anywhere on the page and try again.');
              } else {
                simulateTimelineWithoutAudio(currentSession);
              }
            });
          } else {
            setTimeout(() => {
              audio.play().catch(error => {
                simulateTimelineWithoutAudio(currentSession);
              });
            }, 1000);
          }
        }, 500);
      } catch (error) {
      }
    } else {
      simulateTimelineWithoutAudio(currentSession);
    }
  }, [currentSession, isActive, resetTimelinePosition, updatePosition, processPendingEvents, completeReplay, simulateTimelineWithoutAudio]);
  const stopReplay = useCallback(() => {
    if (!isActive) return;
    resetTimelinePosition();
    if (audioPlayer) {
      audioPlayer.pause();
      const isLocalBlob = audioPlayer.dataset.isLocalBlob === 'true';
      if (isLocalBlob && audioPlayer.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioPlayer.src);
      }
      setAudioPlayer(null);
    }
    replayTimeoutIdsRef.current.forEach(id => window.clearTimeout(id));
    replayTimeoutIdsRef.current = [];
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = 0;
      if (!videoElementRef.current.paused) {
        videoElementRef.current.pause();
      }
    }
    try {
      if (canvasRef.current && canvasRef.current.resetCanvas) {
        canvasRef.current.resetCanvas();
      } else {
        clearAnnotations();
      }
    } catch (error) {
      // Silently handle errors
    }
    pendingEventsRef.current = [];
    setIsActive(false);
    setReplayProgress(0);
  }, [isActive, audioPlayer, resetTimelinePosition, videoElementRef, clearAnnotations]);
  const loadSession = useCallback(async (session: FeedbackSession) => {
    if (session.audioTrack && session.audioTrack.chunks && session.audioTrack.chunks.length > 0) {
      if (typeof window !== 'undefined') {
        window.__sessionReady = false;
      }
      for (let i = 0; i < session.audioTrack.chunks.length; i++) {
        const chunk = session.audioTrack.chunks[i];
        if (chunk.blobUrl) {
          try {
            const url = new URL(chunk.blobUrl);
            const blobPath = url.pathname.split('/').slice(2).join('/');
            const proxyUrl = `/api/audio/${blobPath}`;
            session.audioTrack.chunks[i] = {
              ...chunk,
              blobUrl: proxyUrl
            };
          } catch (error) {
            // Silently handle URL parsing errors
          }
        }
      }
      if (typeof window !== 'undefined') {
        window.__sessionReady = true;
        window.dispatchEvent(new Event('session-ready'));
      }
    }
    setCurrentSession(session);
    const categoriesState: Record<string, number> = {};
    if (session.categories && Object.keys(session.categories).length > 0) {
      Object.entries(session.categories).forEach(([category, rating]) => {
        if (typeof rating === 'number' && rating > 0) {
          categoriesState[category] = rating;
        }
      });
    }
    const allCategoryEvents = session.events.filter(event => event.type === 'category');
    allCategoryEvents.forEach(event => {
      if (event.payload?.category && typeof event.payload.rating === 'number' && event.payload.rating > 0) {
        if (!categoriesState[event.payload.category] || categoriesState[event.payload.category] === 0) {
          categoriesState[event.payload.category] = event.payload.rating;
        }
      }
    });
    const ratedCategories = Object.entries(categoriesState)
      .filter(([_, rating]) => rating > 0)
      .map(([category]) => category);
    if (onCategoriesLoaded) {
      if (Object.keys(categoriesState).length > 0) {
        session.categories = { ...categoriesState };
        setCurrentSession({ ...session });
      }
      const numericCategories: Record<string, number> = {};
      Object.entries(categoriesState).forEach(([key, value]) => {
        numericCategories[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
      });
      onCategoriesLoaded(numericCategories);
      setTimeout(() => {
        if (onCategoriesLoaded) {
          onCategoriesLoaded(numericCategories);
        }
      }, 100);
    }
  }, [onCategoriesLoaded]);
  useEffect(() => {
    return () => {
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        audioRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioPlayer) {
        audioPlayer.pause();
        const isLocalBlob = audioPlayer.dataset.isLocalBlob === 'true';
        if (isLocalBlob && audioPlayer.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioPlayer.src);
        }
      }
      replayTimeoutIdsRef.current.forEach(id => window.clearTimeout(id));
    };
  }, [audioPlayer]);
  useImperativeHandle(ref, () => ({
    isActive,
    currentSession,
    replayProgress,
    startRecordingSession,
    endRecordingSession,
    handleVideoEvent,
    handleAnnotationEvent,
    addMarker,
    handleCategoryEvent,
    startReplay,
    stopReplay,
    completeReplay,
    loadSession,
  }));
  return null;
});
FeedbackOrchestrator.displayName = 'FeedbackOrchestrator';
export default FeedbackOrchestrator;