'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTimeline, useLastClearTime } from '../contexts/TimelineContext';
import type { AudioChunk } from './AudioRecorder';
import type { DrawingPath } from './AnnotationCanvas';
import type { RecordedAction } from './VideoPlayer';

/**
 * Main feedback session structure
 */
export interface FeedbackSession {
  id: string;
  videoId: string;
  startTime: number;
  endTime?: number;
  audioTrack: AudioTrack;
  events: TimelineEvent[];
  categories?: Record<string, boolean>;
}

/**
 * Audio track containing all audio recording data
 */
export interface AudioTrack {
  chunks: AudioChunk[];
  totalDuration: number;
}

/**
 * Timeline event - all synchronized to audio timeline
 */
export interface TimelineEvent {
  id: string;
  type: 'video' | 'annotation' | 'marker' | 'category';
  timeOffset: number; // milliseconds from audio start
  duration?: number; // for events with duration
  payload: any; // specific data based on type
  priority?: number; // priority level for sorting when timestamps match
}

/**
 * Props for the FeedbackOrchestrator component
 */
interface FeedbackOrchestratorProps {
  // Video component ref
  videoElementRef: React.RefObject<HTMLVideoElement>;
  // Annotation canvas component ref and methods
  canvasRef: React.RefObject<any>;
  drawAnnotation: (path: DrawingPath) => void;
  clearAnnotations: () => void;
  // Audio recording methods and callbacks
  onAudioRecorded: (audioTrack: AudioTrack) => void;
  // Session management callbacks
  onSessionComplete: (session: FeedbackSession) => void;
  // Optional initial session for replay
  initialSession?: FeedbackSession | null;
  // Operation mode
  mode: 'record' | 'replay';
  // Callback for when categories are loaded during replay
  onCategoriesLoaded?: (categories: Record<string, boolean>) => void;
}

/**
 * Feedback Orchestrator Component
 * Coordinates all aspects of recording and playback for a feedback session
 */
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
  // State for tracking active session
  const [isActive, setIsActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<FeedbackSession | null>(initialSession || null);
  const [replayProgress, setReplayProgress] = useState(0);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  
  // Use timeline context
  const { updatePosition, resetTimelinePosition } = useTimeline();
  const { updateClearTime } = useLastClearTime();
  
  // Refs for tracking internal state
  const recordingStartTimeRef = useRef<number | null>(null);
  const audioChunksRef = useRef<AudioChunk[]>([]);
  const eventsRef = useRef<TimelineEvent[]>([]);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingEventsRef = useRef<TimelineEvent[]>([]);
  const replayTimeoutIdsRef = useRef<number[]>([]);
  
  // Create a stable event execution function using useState first
  // This ensures it's defined before other functions that depend on it
  const [executeEvent] = useState(() => (event: TimelineEvent) => {
    console.log(`Executing ${event.type} event:`, event.payload);
    
    switch (event.type) {
      case 'video':
        if (videoElementRef.current) {
          const video = videoElementRef.current;
          const payload = event.payload;
          
          // Log the global timeline position for this video event
          console.log(`Executing video ${payload.action} at global time ${event.timeOffset}ms`, {
            videoCurrentTime: video.currentTime,
            eventDetails: payload
          });
          
          switch (payload.action) {
            case 'play':
              video.play().catch(err => console.warn('Failed to play video:', err));
              break;
            case 'pause':
              video.pause();
              break;
            case 'seek':
              if (payload.to !== undefined) {
                // Seek to the target time in the video
                const prevTime = video.currentTime;
                video.currentTime = payload.to;
                console.log(`Replayed seek: ${prevTime.toFixed(2)}s → ${payload.to.toFixed(2)}s (at global time ${event.timeOffset}ms)`);
              }
              break;
            case 'playbackRate':
              if (payload.to !== undefined) {
                const prevRate = video.playbackRate;
                video.playbackRate = payload.to;
                console.log(`Replayed rate change: ${prevRate}x → ${payload.to}x (at global time ${event.timeOffset}ms)`);
              }
              break;
            // Handle keyboard shortcuts too
            case 'keyboardShortcut':
              if (payload.action === 'forward' && payload.to !== undefined) {
                video.currentTime = payload.to;
                console.log(`Replayed forward: to ${payload.to.toFixed(2)}s (at global time ${event.timeOffset}ms)`);
              } else if (payload.action === 'rewind' && payload.to !== undefined) {
                video.currentTime = payload.to;
                console.log(`Replayed rewind: to ${payload.to.toFixed(2)}s (at global time ${event.timeOffset}ms)`);
              } else if (payload.action === 'play') {
                video.play().catch(err => console.warn('Failed to play video:', err));
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
                  // Create a copy of the path to preserve original properties
                  const pathWithTiming = { 
                    ...payload.path,
                    // Ensure the timeOffset from the event is used for replay timing
                    // This ensures the annotation appears at the correct time during replay
                    timeOffset: event.timeOffset,
                    // Always prefer the global timeline (event.timeOffset) for synchronization
                    // This ensures annotations are synchronized to the global timeline, not video time
                    globalTimeOffset: event.timeOffset,
                    // Keep videoTime for backward compatibility
                    videoTime: event.timeOffset
                  };
                  
                  console.log(`Executing drawing at global time ${event.timeOffset}ms`);
                  drawAnnotation(pathWithTiming);
                } catch (error) {
                  console.error('Error during annotation drawing:', error);
                }
              }
              break;
            case 'clear':
              try {
                console.log(`Executing canvas clear at global time ${event.timeOffset}ms`);
                // Record the global time when the clear happened in context
                updateClearTime(event.timeOffset);
                clearAnnotations();
              } catch (error) {
                console.error('Error during annotation clearing:', error);
              }
              break;
          }
        }
        break;
      case 'marker':
        // Could display a marker UI
        console.log('Marker:', event.payload.text);
        break;
      case 'category':
        // We're now handling all categories at the start of replay instead of during timeline events
        console.log(`Processing category event during replay: ${event.payload?.category} = ${event.payload?.rating}`);
        break;
    }
  });
  
  /**
   * Assign priorities to events based on their type
   */
  const assignEventPriority = useCallback((event: TimelineEvent): number => {
    if (event.priority !== undefined) return event.priority;
    
    // Default priority order: video (highest) -> annotation -> marker -> category (lowest)
    switch (event.type) {
      case 'video': return 1;
      case 'annotation': return 2;
      case 'marker': return 3;
      case 'category': return 4;
      default: return 10; // Fallback for any new event types
    }
  }, []);

  /**
   * Process pending events based on current timeline position
   */
  const processPendingEvents = useCallback((currentTimeMs: number) => {
    // Nothing to process
    if (pendingEventsRef.current.length === 0) return;
    
    // Find all events that should be executed by now
    const eventsToExecute: TimelineEvent[] = [];
    const remainingEvents: TimelineEvent[] = [];
    
    // Log current timeline position periodically (every second)
    if (Math.floor(currentTimeMs / 1000) !== Math.floor((currentTimeMs - 100) / 1000)) {
      console.log(`Global timeline position: ${(currentTimeMs / 1000).toFixed(1)}s`);
      
      // Also log how many events are still pending
      if (pendingEventsRef.current.length > 0) {
        const nextEvent = pendingEventsRef.current[0];
        console.log(`Next event: ${nextEvent.type} at ${(nextEvent.timeOffset / 1000).toFixed(1)}s (in ${((nextEvent.timeOffset - currentTimeMs) / 1000).toFixed(1)}s)`);
      }
    }
    
    pendingEventsRef.current.forEach(event => {
      if (event.timeOffset <= currentTimeMs) {
        eventsToExecute.push(event);
      } else {
        remainingEvents.push(event);
      }
    });
    
    // Update the pending events
    pendingEventsRef.current = remainingEvents;
    
    // If no events to execute, return early
    if (eventsToExecute.length === 0) return;
    
    // Sort events by timestamp first, then by priority
    eventsToExecute.sort((a, b) => {
      // First sort by timeOffset
      if (a.timeOffset !== b.timeOffset) {
        return a.timeOffset - b.timeOffset;
      }
      
      // If same timeOffset, sort by priority
      return assignEventPriority(a) - assignEventPriority(b);
    });
    
    // Log processing information
    console.log(`Processing ${eventsToExecute.length} events at global timeline ${currentTimeMs}ms`, {
      eventsToExecute: eventsToExecute.map(e => ({
        id: e.id, 
        type: e.type, 
        timeOffset: e.timeOffset,
        priority: assignEventPriority(e),
        action: e.type === 'annotation' ? e.payload.action : 
              (e.type === 'video' ? e.payload.action : 'none'),
        // Add more detailed information about video events
        details: e.type === 'video' ? {
          action: e.payload.action,
          from: e.payload.from,
          to: e.payload.to,
          globalTimeOffset: e.payload.globalTimeOffset
        } : undefined
      })),
      remainingCount: pendingEventsRef.current.length
    });
    
    // Use requestAnimationFrame for smooth event execution
    // This ensures all events are executed within a single frame
    requestAnimationFrame(() => {
      // Execute all events in proper order
      // Use Promise.resolve().then to ensure position updates complete before event processing
      Promise.resolve().then(() => {
        eventsToExecute.forEach(event => {
          // For category events, use requestAnimationFrame to ensure UI updates properly
          if (event.type === 'category') {
            requestAnimationFrame(() => {
              executeEvent(event);
            });
          } else {
            // Execute other events immediately
            executeEvent(event);
          }
        });
      });
    });
  }, [assignEventPriority, executeEvent]);
  
  /**
   * Generate a unique ID
   */
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }, []);
  
  /**
   * Initialize a new recording session
   */
  const startRecordingSession = useCallback(async () => {
    if (isActive) return;
    
    try {
      // Start audio recording
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
      
      // Determine best audio format
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
      
      console.log(`Using audio format: ${mimeType || 'default'}`);
      
      // Configure recorder
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000
      });
      
      audioRecorderRef.current = recorder;
      
      // Set up data handling
      const chunks: Blob[] = [];
      audioChunksRef.current = [];
      eventsRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      // Handle recording stop
      recorder.onstop = async () => {
        if (chunks.length === 0) return;
        
        // Create the main audio blob
        const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        
        // Calculate duration
        const recordingEndTime = Date.now();
        const startTime = recordingStartTimeRef.current || 0;
        const duration = recordingEndTime - startTime;
        
        // Create audio chunk
        const audioChunk: AudioChunk = {
          blob: audioBlob,
          startTime: startTime,
          duration: duration,
          videoTime: 0,
          mimeType: mimeType || 'audio/webm'
        };
        
        // Create and finalize session
        audioChunksRef.current = [audioChunk];
        
        const audioTrack: AudioTrack = {
          chunks: audioChunksRef.current,
          totalDuration: duration
        };
        
        const session: FeedbackSession = {
          id: generateId(),
          videoId: 'video-' + generateId(),
          startTime: startTime,
          endTime: recordingEndTime,
          audioTrack: audioTrack,
          events: eventsRef.current
        };
        
        setCurrentSession(session);
        onAudioRecorded(audioTrack);
        onSessionComplete(session);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };
      
      // Start recording
      const startTime = Date.now();
      recordingStartTimeRef.current = startTime;
      
      console.log(`Starting recording session at ${new Date(startTime).toISOString()}`);
      recorder.start();
      
      // Create the new session object
      const newSession: FeedbackSession = {
        id: generateId(),
        videoId: 'video-' + generateId(),
        startTime: startTime,
        audioTrack: { chunks: [], totalDuration: 0 },
        events: []
      };
      
      setCurrentSession(newSession);
      setIsActive(true);
      
    } catch (error) {
      console.error('Failed to start recording session:', error);
      alert(`Could not start recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [isActive, generateId, onAudioRecorded, onSessionComplete]);
  
  /**
   * End the current recording session
   */
  const endRecordingSession = useCallback(() => {
    if (!isActive) return;
    
    console.log('Ending recording session');
    
    // Stop audio recording
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset recording state
    setIsActive(false);
    recordingStartTimeRef.current = null;
    
    // Note: Video reset and annotation clearing are now handled by VideoPlayerWrapper
  }, [isActive]);
  
  /**
   * Record a timeline event during recording
   */
  const recordEvent = useCallback((type: 'video' | 'annotation' | 'marker', payload: any, duration?: number) => {
    if (!isActive || !recordingStartTimeRef.current) return;
    
    const now = Date.now();
    const timeOffset = now - recordingStartTimeRef.current;
    
    // Assign default priority based on event type
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
    console.log(`Recorded ${type} event at ${timeOffset}ms:`, payload);
    
    return event;
  }, [isActive, generateId]);
  
  /**
   * Handle video events (play, pause, seek, etc.)
   */
  const handleVideoEvent = useCallback((action: string, details?: any) => {
    return recordEvent('video', { action, ...details });
  }, [recordEvent]);
  
  /**
   * Handle annotation events (drawing, clearing)
   */
  const handleAnnotationEvent = useCallback((action: string, path?: DrawingPath) => {
    console.log(`Recording annotation event: ${action}`, {
      hasPath: !!path,
      pointsCount: path?.points?.length || 0,
      color: path?.color,
      width: path?.width
    });
    
    // Record the event in the timeline
    const event = recordEvent('annotation', { action, path });
    
    // For debugging during development
    if (event) {
      console.log(`Annotation event recorded with ID: ${event.id}`, {
        timeOffset: event.timeOffset,
        eventCount: eventsRef.current.length
      });
    } else {
      console.warn('Failed to record annotation event - recording may not be active');
    }
    
    return event;
  }, [recordEvent]);
  
  /**
   * Add a marker at the current time
   */
  const addMarker = useCallback((text: string) => {
    return recordEvent('marker', { text });
  }, [recordEvent]);
  
  /**
   * Record a category change
   */
  const handleCategoryEvent = useCallback((category: string, rating: number) => {
    console.log(`Recording category change: ${category} = ${rating}`);
    
    // Create event with lower priority for category events
    if (!isActive || !recordingStartTimeRef.current) return;
    
    const now = Date.now();
    const timeOffset = now - recordingStartTimeRef.current;
    
    const event: TimelineEvent = {
      id: generateId(),
      type: 'category',
      timeOffset,
      payload: { category, rating },
      priority: 4  // Lowest priority for category events
    };
    
    eventsRef.current.push(event);
    console.log(`Recorded category event at ${timeOffset}ms:`, { category, rating });
    
    return event;
  }, [isActive, generateId]);
  
  /**
   * Complete the replay process
   */
  const completeReplay = useCallback(() => {
    // Reset global timeline position and last clear time when replay completes
    resetTimelinePosition();
    console.log('Timeline position and lastClearTime reset to 0ms via context at completion');
    
    // Clean up audio player
    if (audioPlayer) {
      audioPlayer.pause();
      if (audioPlayer.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioPlayer.src);
      }
      setAudioPlayer(null);
    }
    
    // Clear any timeouts
    replayTimeoutIdsRef.current.forEach(id => window.clearTimeout(id));
    replayTimeoutIdsRef.current = [];
    
    // Reset video position to the beginning
    if (videoElementRef.current) {
      console.log('Replay complete: resetting video position to start');
      videoElementRef.current.currentTime = 0;
      
      // If it's playing, pause it
      if (!videoElementRef.current.paused) {
        videoElementRef.current.pause();
      }
    }
    
    // Clear all annotations when replay is done using the new state-based reset
    try {
      console.log('Replay complete: performing state-based canvas reset');
      // Try the new resetCanvas method first
      if (canvasRef.current && canvasRef.current.resetCanvas) {
        canvasRef.current.resetCanvas();
      } else {
        // Fall back to the original clear method if resetCanvas isn't available
        console.log('Replay complete: falling back to standard clear annotations');
        clearAnnotations();
      }
    } catch (error) {
      console.error('Error clearing annotations on replay completion:', error);
    }
    
    // Ensure any pending events are cleared
    pendingEventsRef.current = [];
    
    // Update state to indicate replay is complete but maintain the 100% progress
    setIsActive(false);
    setReplayProgress(100);
    
    // Use setTimeout to reset progress to 0 after a brief delay
    // This gives users visual feedback that replay completed successfully
    setTimeout(() => {
      setReplayProgress(0);
      console.log('Replay progress reset to 0');
    }, 1500);
    
  }, [audioPlayer, videoElementRef, clearAnnotations, resetTimelinePosition]);
  
  /**
   * Start replay of a feedback session
   */
  const startReplay = useCallback(() => {
    if (!currentSession || isActive) return;
    
    // Reset global timeline position and last clear time at the start of replay
    resetTimelinePosition();
    console.log('Timeline position and lastClearTime reset to 0ms via context');
    
    setIsActive(true);
    setReplayProgress(0);
    
    // Clear any previous timeouts
    replayTimeoutIdsRef.current.forEach(id => window.clearTimeout(id));
    replayTimeoutIdsRef.current = [];
    
    // Clear any pending events
    pendingEventsRef.current = [];
    
    // Create a copy of events to process and sort them by timestamp first, then by type priority
    pendingEventsRef.current = [...currentSession.events].sort((a, b) => {
      // First sort by timeOffset
      if (a.timeOffset !== b.timeOffset) {
        return a.timeOffset - b.timeOffset;
      }
      
      // If same timeOffset, sort by priority (add priorities if they don't exist)
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
    
    // Create audio player for the main timeline
    if (currentSession.audioTrack.chunks.length > 0) {
      const mainAudioChunk = currentSession.audioTrack.chunks[0];
      
      if (!mainAudioChunk.blob) {
        console.error('No valid audio blob in the session');
        return;
      }
      
      try {
        let audioUrl: string;
        
        if (mainAudioChunk.blob instanceof Blob) {
          audioUrl = URL.createObjectURL(mainAudioChunk.blob);
        } else if (typeof mainAudioChunk.blob === 'string' && mainAudioChunk.blob.startsWith('data:')) {
          // Handle data URL
          // This could be improved with proper conversion
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
        } else {
          throw new Error('Unsupported audio format');
        }
        
        const audio = new Audio(audioUrl);
        
        // Set up audio events
        audio.onplay = () => {
          console.log('Audio playback started');
        };
        
        audio.ontimeupdate = () => {
          const currentTime = audio.currentTime * 1000; // Convert to ms
          const totalDuration = currentSession.audioTrack.totalDuration;
          setReplayProgress((currentTime / totalDuration) * 100);
          
          // Use requestAnimationFrame for smoother updates
          requestAnimationFrame(() => {
            // Update global timeline position via context
            updatePosition(currentTime);
            
            // Log global time position every 250ms (to avoid flooding logs)
            if (Math.floor(currentTime / 250) !== Math.floor((currentTime - 16) / 250)) {
              console.log(`Timeline position updated via context: ${currentTime}ms`);
            }
            
            // Use Promise.resolve().then to ensure position updates complete before event processing
            Promise.resolve().then(() => {
              // Process any pending events that should occur by this time
              processPendingEvents(currentTime);
            });
          });
        };
        
        audio.onended = () => {
          console.log('Audio playback complete, cleaning up and resetting UI...');
          completeReplay();
          // Ensure the active state in parent component is also updated
          setIsActive(false);
        };
        
        audio.onerror = (e) => {
          console.error('Audio playback error:', audio.error);
        };
        
        setAudioPlayer(audio);
        
        // Start playback
        audio.play().catch(error => {
          console.error('Failed to start audio playback:', error);
          alert('Failed to start audio playback. Try clicking on the page first.');
        });
      } catch (error) {
        console.error('Error creating audio player for replay:', error);
      }
    } else {
      console.warn('No audio track found for replay. Using simulated timeline.');
      
      // Simulate timeline with setTimeout if no audio
      const totalDuration = currentSession.events.length > 0 
        ? Math.max(...currentSession.events.map(e => e.timeOffset)) + 5000
        : 30000; // Default 30s if no events
      
      let elapsed = 0;
      const interval = 100; // 100ms updates
      
      const timelineInterval = window.setInterval(() => {
        elapsed += interval;
        setReplayProgress((elapsed / totalDuration) * 100);
        
        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
          // Update global timeline position via context
          updatePosition(elapsed);
          
          // Log global time position every second to avoid flooding logs
          if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - interval) / 1000)) {
            console.log(`Timeline position updated via context (simulated): ${elapsed}ms`);
          }
          
          // Use Promise.resolve().then to ensure position updates complete before event processing
          Promise.resolve().then(() => {
            processPendingEvents(elapsed);
          });
          
          if (elapsed >= totalDuration) {
            clearInterval(timelineInterval);
            console.log('Simulated timeline complete, cleaning up and resetting...');
            completeReplay();
            // Ensure the active state is updated
            setIsActive(false);
          }
        });
      }, interval);
      
      replayTimeoutIdsRef.current.push(timelineInterval as unknown as number);
    }
  }, [currentSession, isActive, resetTimelinePosition, updatePosition, processPendingEvents, completeReplay]);
  
  /**
   * Stop the current replay
   */
  const stopReplay = useCallback(() => {
    if (!isActive) return;
    
    console.log('Stopping replay session');
    
    // Reset global timeline position and last clear time when stopping replay
    resetTimelinePosition();
    console.log('Timeline position and lastClearTime reset to 0ms via context');
    
    // Clean up audio player
    if (audioPlayer) {
      audioPlayer.pause();
      if (audioPlayer.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioPlayer.src);
      }
      setAudioPlayer(null);
    }
    
    // Clear any timeouts
    replayTimeoutIdsRef.current.forEach(id => window.clearTimeout(id));
    replayTimeoutIdsRef.current = [];
    
    // Reset video position to the beginning
    if (videoElementRef.current) {
      console.log('Replay stopped: resetting video position to start');
      videoElementRef.current.currentTime = 0;
      
      // If it's playing, pause it
      if (!videoElementRef.current.paused) {
        videoElementRef.current.pause();
      }
    }
    
    // Clear all annotations when replay is stopped using the new state-based reset
    try {
      console.log('Replay stopped: performing state-based canvas reset');
      // Try the new resetCanvas method first
      if (canvasRef.current && canvasRef.current.resetCanvas) {
        canvasRef.current.resetCanvas();
      } else {
        // Fall back to the original clear method if resetCanvas isn't available
        console.log('Replay stopped: falling back to standard clear annotations');
        clearAnnotations();
      }
    } catch (error) {
      console.error('Error clearing annotations when stopping replay:', error);
    }
    
    // Ensure any pending events are cleared
    pendingEventsRef.current = [];
    
    // Reset replay state
    setIsActive(false);
    setReplayProgress(0);
  }, [isActive, audioPlayer, resetTimelinePosition, videoElementRef, clearAnnotations]);
  
  /**
   * Load a session for replay
   */
  const loadSession = useCallback((session: FeedbackSession) => {
    console.log('Loading session for replay, session ID:', session.id);
    console.log('Total events in session:', session.events.length);
    console.log('All event types:', session.events.map(e => e.type));
    
    setCurrentSession(session);
    
    // Detailed log of all events to debug
    session.events.forEach((event, index) => {
      console.log(`Event ${index}: type=${event.type}, timeOffset=${event.timeOffset}, payload=`, event.payload);
    });
    
    // Try direct approach first: check if session has categories property
    if (session.categories && Object.keys(session.categories).length > 0) {
      console.log('Session has categories property directly:', session.categories);
      
      if (onCategoriesLoaded) {
        console.log('Using categories directly from session:', session.categories);
        
        // Use the categories directly since they're already in the right format
        setTimeout(() => {
          onCategoriesLoaded(session.categories);
        }, 100);
        
        // We've handled categories directly, so we can return
        return;
      }
    }
    
    // Fallback to category events if no direct categories property
    console.log('No direct categories property, looking for category events...');
    
    // Find all category events, regardless of rating status first
    const allCategoryEvents = session.events.filter(event => event.type === 'category');
    console.log(`Found ${allCategoryEvents.length} total category events in session`);
    
    // Use the most recent state of each category (last event for each category determines its rating)
    const categoriesState: Record<string, number> = {};
    
    // Process events in chronological order so we end up with the final state
    allCategoryEvents.forEach(event => {
      if (event.payload?.category) {
        categoriesState[event.payload.category] = event.payload.rating || 0;
        console.log(`Category ${event.payload.category} = ${event.payload.rating}`);
      }
    });
    
    // Find which categories have ratings in the final state
    const ratedCategories = Object.entries(categoriesState)
      .filter(([_, rating]) => rating > 0)
      .map(([category]) => category);
    
    console.log(`Final state has ${ratedCategories.length} rated categories:`, ratedCategories);
    
    // If we have categories and a callback, send all the categories at once
    if (Object.keys(categoriesState).length > 0 && onCategoriesLoaded) {
      console.log('Final categories state to send:', categoriesState);
      
      // Notify parent about all categories - use setTimeout to ensure it happens after component mount
      setTimeout(() => {
        if (onCategoriesLoaded) {
          console.log('Calling onCategoriesLoaded with:', categoriesState);
          onCategoriesLoaded(categoriesState);
        }
      }, 100);
    } else {
      console.warn('No category events found in the session or callback missing', {
        allCategoryEvents: allCategoryEvents.length,
        categoriesState: Object.keys(categoriesState).length,
        hasCallback: !!onCategoriesLoaded
      });
    }
  }, [onCategoriesLoaded]);
  
  /**
   * Clean up resources when component unmounts
   */
  useEffect(() => {
    return () => {
      // Stop recording if active
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        audioRecorderRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Clean up audio player
      if (audioPlayer) {
        audioPlayer.pause();
        if (audioPlayer.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioPlayer.src);
        }
      }
      
      // Clear any timeouts
      replayTimeoutIdsRef.current.forEach(id => window.clearTimeout(id));
    };
  }, [audioPlayer]);
  
  // Expose imperative methods to parent component using the ref
  useImperativeHandle(ref, () => ({
    // Status
    isActive,
    currentSession,
    replayProgress,
    
    // Recording methods
    startRecordingSession,
    endRecordingSession,
    handleVideoEvent,
    handleAnnotationEvent,
    addMarker,
    handleCategoryEvent,
    
    // Replay methods
    startReplay,
    stopReplay,
    completeReplay,
    loadSession,
  }));
  
  // Return null as this is a controller component without UI
  return null;
});

FeedbackOrchestrator.displayName = 'FeedbackOrchestrator';

export default FeedbackOrchestrator;