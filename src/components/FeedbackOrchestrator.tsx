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
  categories?: Record<string, number | boolean>;
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
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
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
  onCategoriesLoaded?: (categories: Record<string, number | boolean>) => void;
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
                // Seek to the target time in the video
                video.currentTime = payload.to;
              }
              break;
            case 'playbackRate':
              if (payload.to !== undefined) {
                video.playbackRate = payload.to;
              }
              break;
            // Handle keyboard shortcuts too
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
        break;
      case 'category':
        // We're now handling all categories at the start of replay instead of during timeline events
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
        
        // Generate a session ID if we don't have one yet
        const sessionId = generateId();
        
        // Try to upload the audio blob to Azure Storage
        let blobUrl: string | undefined;
        try {
          // Import the audio storage utility
          const { uploadAudioToStorage } = await import('../utils/audioStorage');
          
          // Make sure we have a valid blob
          if (audioBlob && audioBlob.size > 0) {
            // Upload the blob to Azure Storage
            blobUrl = await uploadAudioToStorage(audioBlob, sessionId);
            console.log('Audio blob uploaded to Azure Storage:', blobUrl);
          } else {
            console.warn('No valid audio blob to upload to Azure Storage');
          }
        } catch (error) {
          console.error('Failed to upload audio to Azure Storage:', error);
          // Continue with local blob if upload fails
        }
        
        // Create audio chunk (with blobUrl if available)
        const audioChunk: AudioChunk = {
          blob: audioBlob,
          startTime: startTime,
          duration: duration,
          videoTime: 0,
          mimeType: mimeType || 'audio/webm',
          blobUrl: blobUrl
        };
        
        // Create and finalize session
        audioChunksRef.current = [audioChunk];
        
        const audioTrack: AudioTrack = {
          chunks: audioChunksRef.current,
          totalDuration: duration
        };
        
        // Get current session to preserve categories
        const currentSessionData = currentSession || { categories: {} };
        
        // Make sure we have the most up-to-date categories
        console.log('Building final session with categories:', currentSessionData.categories);
        
        // Create a properly-typed categories object
        const categories: Record<string, number> = {};
        
        // Ensure all category values are numbers, not null
        if (currentSessionData.categories) {
          // Use type assertion to help TypeScript understand the structure
          const cats = currentSessionData.categories as Record<string, number | boolean>;
          Object.keys(cats).forEach(key => {
            const value = cats[key];
            // Include all non-zero ratings, including booleans converted to numbers
            if (typeof value === 'number' && value > 0) {
              categories[key] = value;
            } else if (typeof value === 'boolean' && value) {
              categories[key] = 1; // Convert true to 1
            }
          });
        }
        
        console.log('Final clean categories object for saving:', categories);
        
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
        events: [],
        categories: {} // Initialize empty categories object
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
   * Record a category change - store only in categories object, not as events
   */
  const handleCategoryEvent = useCallback((category: string, rating: number) => {
    console.log(`Recording category change: ${category} = ${rating}`);
    
    // Allow category updates even when not recording
    // This ensures category changes are saved regardless of recording state
    
    // Update the session's categories directly
    setCurrentSession(prevSession => {
      if (!prevSession) {
        // Create initial session if none exists
        return {
          id: generateId(),
          videoId: 'unknown', 
          startTime: recordingStartTimeRef.current || Date.now(),
          events: [],
          audioTrack: { chunks: [], totalDuration: 0 },
          categories: { [category]: rating }
        };
      }
      
      // Get current categories or initialize empty object
      const currentCategories = prevSession.categories || {};
      
      // Create new categories object with the updated rating
      const updatedCategories = {
        ...currentCategories,
        [category]: rating > 0 ? rating : null // Store as null if rating is 0, otherwise store the actual rating
      };
      
      console.log('Updated categories object:', updatedCategories);
      
      // Update existing session - only update categories, don't add to events
      return {
        ...prevSession,
        categories: updatedCategories
      };
    });
    
    // Log the current session after update (for debugging)
    setTimeout(() => {
      console.log('Current session after category update:', currentSession);
    }, 50);
    
    console.log(`Updated session categories with ${category}: ${rating}`);

    // Also save this as a category event to ensure proper recording
    const event = {
      id: generateId(),
      type: 'category' as const,
      timeOffset: Date.now() - (recordingStartTimeRef.current || Date.now()),
      payload: { category, rating },
      priority: 4
    };
    
    // Add to events array if we're recording
    if (isActive && recordingStartTimeRef.current) {
      eventsRef.current.push(event);
    }
  }, [generateId, currentSession, isActive]);
  
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
      
      // Only revoke object URL if it's a local blob (not an Azure Storage URL)
      const isLocalBlob = audioPlayer.dataset.isLocalBlob === 'true';
      if (isLocalBlob && audioPlayer.src.startsWith('blob:')) {
        console.log('Revoking local blob URL:', audioPlayer.src);
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
    
    // Reset the replay flags in the window object to return to initial state
    if (typeof window !== 'undefined') {
      window.__isReplaying = false;
      console.log('Reset replay flag in window object');
    }
    
    // Use setTimeout to reset progress to 0 after a brief delay
    // This gives users visual feedback that replay completed successfully
    setTimeout(() => {
      setReplayProgress(0);
      console.log('Replay progress reset to 0');
      
      // Call resetState on the parent component to fully reset to initial state
      if (typeof window !== 'undefined' && window.__videoPlayerWrapper && window.__videoPlayerWrapper.resetState) {
        console.log('Calling resetState on VideoPlayerWrapper to reset to initial state');
        window.__videoPlayerWrapper.resetState();
      }
    }, 1500);
    
  }, [audioPlayer, videoElementRef, clearAnnotations, resetTimelinePosition]);
  
  /**
   * Helper function to simulate timeline without audio
   */
  const simulateTimelineWithoutAudio = useCallback((session: FeedbackSession) => {
    console.log('Using simulated timeline instead of audio playback');
    
    // Calculate the total duration from events or use a default
    const totalDuration = session.events.length > 0 
      ? Math.max(...session.events.map(e => e.timeOffset)) + 5000
      : 30000; // Default 30s if no events
    
    console.log(`Simulating timeline for ${totalDuration}ms`);
    
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
    
    // Store the interval ID for cleanup
    replayTimeoutIdsRef.current.push(timelineInterval as unknown as number);
  }, [updatePosition, processPendingEvents, completeReplay]);
  
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
      
      try {
        let audioUrl: string;
        let isLocalBlob = false;
        
        // First check if we have a blob URL from Azure Storage
        if (mainAudioChunk.blobUrl) {
          console.log('Using Azure Storage blob URL for audio playback:', mainAudioChunk.blobUrl);
          // Use the direct URL from Azure Storage
          audioUrl = mainAudioChunk.blobUrl;
        }
        // Fall back to local blob or data URL if no Azure URL is available
        else if (mainAudioChunk.blob instanceof Blob) {
          console.log('Using local Blob object for audio playback');
          audioUrl = URL.createObjectURL(mainAudioChunk.blob);
          isLocalBlob = true;
        } else if (typeof mainAudioChunk.blob === 'string' && mainAudioChunk.blob.startsWith('data:')) {
          // Handle data URL
          console.log('Converting data URL to Blob for audio playback');
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
          console.error('No valid audio blob or blob URL in the session');
          return;
        } else {
          throw new Error('Unsupported audio format');
        }
        
        console.log(`Creating audio player with URL: ${audioUrl.substring(0, 50)}...`);
        
        const audio = new Audio();
        
        // Add event listeners before setting src to catch any loading errors
        audio.preload = 'auto';
        
        // Add a load listener to detect when audio is ready
        audio.onloadeddata = () => {
          console.log('Audio data loaded successfully:', {
            duration: audio.duration,
            readyState: audio.readyState
          });
        };
        
        // Set up audio events
        audio.onplay = () => {
          console.log('Audio playback started');
        };
        
        // Set src after adding listeners
        audio.src = audioUrl;
        
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
          const errorInfo = {
            code: audio.error ? audio.error.code : 'unknown',
            message: audio.error ? audio.error.message : 'No error details available',
            src: audioUrl.substring(0, 100) + '...',
            audioType: isLocalBlob ? 'local-blob' : (audioUrl.startsWith('/api') ? 'proxy-url' : 'azure-url'),
            readyState: audio.readyState,
            networkState: audio.networkState,
            error: audio.error
          };
          console.error('Audio playback error:', errorInfo);
          
          // Try to recover by stopping and restarting
          try {
            audio.pause();
            setTimeout(() => {
              console.log('Attempting to restart audio playback after error...');
              audio.load();
              audio.play().catch(err => {
                console.error('Failed to restart audio playback:', err);
                completeReplay(); // Stop the replay if we can't recover
              });
            }, 1000);
          } catch (recoverError) {
            console.error('Error attempting to recover from audio playback error:', recoverError);
            completeReplay(); // Stop the replay if we can't recover
          }
        };
        
        // Store isLocalBlob status with the audio player for cleanup
        audio.dataset.isLocalBlob = isLocalBlob.toString();
        
        setAudioPlayer(audio);
        
        // Wait a moment to ensure the audio is loaded before playing
        setTimeout(() => {
          console.log('Attempting to start audio playback...');
          
          // First check if audio is ready
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or better
            console.log('Audio is ready to play, starting playback');
            audio.play().catch(error => {
              console.error('Failed to start audio playback despite ready state:', error);
              
              // Show a user-friendly message for autoplay policy errors
              if (error.name === 'NotAllowedError') {
                alert('Audio playback requires user interaction. Please click anywhere on the page and try again.');
              } else {
                // Fall back to simulated playback if audio fails completely
                console.log('Switching to simulated timeline mode due to audio error');
                simulateTimelineWithoutAudio(currentSession);
              }
            });
          } else {
            console.warn(`Audio not ready yet, readyState: ${audio.readyState}. Retrying in 1 second...`);
            
            // Retry after a delay
            setTimeout(() => {
              console.log('Retrying audio playback...');
              audio.play().catch(error => {
                console.error('Failed to start audio playback on retry:', error);
                
                // Fall back to simulated playback if audio fails completely
                console.log('Switching to simulated timeline mode due to audio error');
                simulateTimelineWithoutAudio(currentSession);
              });
            }, 1000);
          }
        }, 500);
      } catch (error) {
        console.error('Error creating audio player for replay:', error);
      }
    } else {
      console.warn('No audio track found for replay. Using simulated timeline.');
      
      // Use the dedicated helper function for simulated timeline
      simulateTimelineWithoutAudio(currentSession);
    }
  }, [currentSession, isActive, resetTimelinePosition, updatePosition, processPendingEvents, completeReplay, simulateTimelineWithoutAudio]);
  
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
      
      // Only revoke object URL if it's a local blob (not an Azure Storage URL)
      const isLocalBlob = audioPlayer.dataset.isLocalBlob === 'true';
      if (isLocalBlob && audioPlayer.src.startsWith('blob:')) {
        console.log('Revoking local blob URL:', audioPlayer.src);
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
  const loadSession = useCallback(async (session: FeedbackSession) => {
    console.log('Loading session for replay, session ID:', session.id);
    console.log('Total events in session:', session.events.length);
    console.log('All event types:', session.events.map(e => e.type));
    
    // If we have audio chunks with blobUrl from Azure Storage, preload them and convert to proxy URLs
    if (session.audioTrack && session.audioTrack.chunks && session.audioTrack.chunks.length > 0) {
      // Set flag that session is loading
      if (typeof window !== 'undefined') {
        window.__sessionReady = false;
      }
      
      for (let i = 0; i < session.audioTrack.chunks.length; i++) {
        const chunk = session.audioTrack.chunks[i];
        if (chunk.blobUrl) {
          try {
            console.log('Processing Azure Storage blob URL:', chunk.blobUrl);
            
            // Convert Azure Storage URL to our proxy URL to avoid CORS issues
            try {
              const url = new URL(chunk.blobUrl);
              const blobPath = url.pathname.split('/').slice(2).join('/'); // Extract path after container name
              
              // Create a proxy URL that goes through our Next.js API
              const proxyUrl = `/api/audio/${blobPath}`;
              console.log(`Converted Azure URL to proxy URL: ${proxyUrl}`);
              
              // Update the chunk's URL to use our proxy instead
              session.audioTrack.chunks[i] = {
                ...chunk,
                blobUrl: proxyUrl
              };
            } catch (urlError) {
              console.warn('Failed to convert Azure URL to proxy URL:', urlError);
              // Keep original URL if conversion fails
            }
            
            if (typeof window !== 'undefined') {
              console.log('Using proxy URL to avoid CORS issues:', session.audioTrack.chunks[i].blobUrl);
            }
          } catch (error) {
            console.error('Error processing audio blob URL:', error);
            // Continue with next chunk
          }
        }
      }
      
      // Mark session as ready after processing all chunks
      if (typeof window !== 'undefined') {
        window.__sessionReady = true;
        window.dispatchEvent(new Event('session-ready'));
      }
    }
    
    setCurrentSession(session);
    
    // Detailed log of all events to debug
    session.events.forEach((event, index) => {
      console.log(`Event ${index}: type=${event.type}, timeOffset=${event.timeOffset}, payload=`, event.payload);
    });
    
    // Combine both approaches for most reliable category data
    const categoriesState: Record<string, number> = {};
    
    // First collect categories from direct property if available (primary source)
    if (session.categories && Object.keys(session.categories).length > 0) {
      console.log('Session has categories property directly:', session.categories);
      
      // Add all categories from session.categories
      Object.entries(session.categories).forEach(([category, rating]) => {
        if (typeof rating === 'number' && rating > 0) {
          categoriesState[category] = rating;
        }
      });
      
      console.log('Added categories from direct property:', Object.keys(categoriesState));
    }
    
    // Then also check category events as a fallback or supplementary source
    const allCategoryEvents = session.events.filter(event => event.type === 'category');
    console.log(`Found ${allCategoryEvents.length} total category events in session`);
    
    // Add or update categories from events
    allCategoryEvents.forEach(event => {
      if (event.payload?.category && typeof event.payload.rating === 'number' && event.payload.rating > 0) {
        // Only add if not already present (prefer session.categories) or if it's zero in categories
        if (!categoriesState[event.payload.category] || categoriesState[event.payload.category] === 0) {
          categoriesState[event.payload.category] = event.payload.rating;
          console.log(`Added category from event: ${event.payload.category} = ${event.payload.rating}`);
        }
      }
    });
    
    // Find which categories have ratings in the final state
    const ratedCategories = Object.entries(categoriesState)
      .filter(([_, rating]) => rating > 0)
      .map(([category]) => category);
    
    console.log(`Final state has ${ratedCategories.length} rated categories:`, ratedCategories);
    
    // Even if we have no ratings, send the empty state to ensure UI is updated
    if (onCategoriesLoaded) {
      console.log('Final categories state to send:', categoriesState);
      
      // Update session's categories property for future reference
      if (Object.keys(categoriesState).length > 0) {
        session.categories = { ...categoriesState };
        setCurrentSession({ ...session });
      }
      
      // Ensure we're sending the numeric values directly, not boolean conversions
      const numericCategories: Record<string, number> = {};
      Object.entries(categoriesState).forEach(([key, value]) => {
        // Ensure values are stored as numbers
        numericCategories[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
      });
      
      // Notify parent right away
      onCategoriesLoaded(numericCategories);
      
      // Also schedule a delayed notification to ensure component has mounted
      setTimeout(() => {
        if (onCategoriesLoaded) {
          console.log('Delayed call to onCategoriesLoaded with:', categoriesState);
          onCategoriesLoaded(numericCategories);
        }
      }, 100);
    } else {
      console.warn('No callback available for notifying categories', {
        categoriesState: Object.keys(categoriesState).length
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
        
        // Only revoke object URL if it's a local blob (not an Azure Storage URL)
        const isLocalBlob = audioPlayer.dataset.isLocalBlob === 'true';
        if (isLocalBlob && audioPlayer.src.startsWith('blob:')) {
          console.log('Revoking local blob URL:', audioPlayer.src);
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