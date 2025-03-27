'use client';

import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';

export interface Point {
  x: number;
  y: number;
}

// Add type for window global storage
declare global {
  interface Window {
    __hiddenAnnotations?: DrawingPath[];
    __clearEvents?: Array<{
      timestamp: number;
      videoTime: number;
      absoluteTime: number;
    }>;
  }
}

export interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
  timestamp: number;
  videoTime?: number; // Time in the video when this annotation was created (in ms)
  id: string; // Unique identifier for the drawing - now required
  visible: boolean; // Whether the drawing should be visible - now required
  hiddenAt?: number; // Time when the drawing was hidden (cleared)
  isClearEvent?: boolean; // Flag to identify clear events
}

interface AnnotationCanvasProps {
  width: number;
  height: number;
  isEnabled: boolean;
  currentTime: number;
  isRecording?: boolean;
  isReplaying?: boolean;
  onAnnotationAdded?: (path: DrawingPath) => void;
  replayAnnotations?: DrawingPath[];
  toolColor?: string;
  toolWidth?: number;
  clearCanvas?: boolean;
  onClearComplete?: () => void;
}

const AnnotationCanvas = forwardRef<any, AnnotationCanvasProps>(({
  width,
  height,
  isEnabled,
  currentTime,
  isRecording = false,
  isReplaying = false,
  onAnnotationAdded,
  replayAnnotations = [],
  toolColor = '#ff0000',
  toolWidth = 4,
  clearCanvas = false,
  onClearComplete
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [allDrawings, setAllDrawings] = useState<DrawingPath[]>([]);
  
  // Reference to track recording start time for consistent relative timestamps
  const recordingStartTimeRef = useRef<number | null>(null);
  
  // Set recording start time when recording is enabled
  useEffect(() => {
    if (isRecording && !recordingStartTimeRef.current) {
      recordingStartTimeRef.current = Date.now();
      console.log('Recording started at:', recordingStartTimeRef.current);
    } else if (!isRecording) {
      recordingStartTimeRef.current = null;
    }
  }, [isRecording]);
  
  // Get canvas context in a memoized way
  const getContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return ctx;
  };

  // Clear the canvas
  const clearCanvasDrawings = () => {
    const ctx = getContext();
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
    
    const currentVideoTime = currentTime * 1000;
    const now = Date.now();
    
    // Create standardized clear marker
    const clearMark = {
      id: `clear-${now}`,
      timestamp: now,
      videoTime: currentVideoTime,
      clearVideoTime: currentVideoTime,
      clearTimestamp: now,
      isClearEvent: true,
      points: [],
      color: 'transparent',
      width: 0,
      visible: false,
      hiddenAt: currentVideoTime
    };
    
    // Always mark drawings as hidden with consistent metadata
    const hiddenDrawings = allDrawings.map(drawing => ({
      ...drawing,
      visible: false,
      hiddenAt: currentVideoTime
    }));
    
    // Store hidden drawings in window storage regardless of mode
    if (typeof window !== 'undefined') {
      window.__hiddenAnnotations = window.__hiddenAnnotations || [];
      window.__hiddenAnnotations.push(...hiddenDrawings);
      
      // Also track clear event
      window.__clearEvents = window.__clearEvents || [];
      window.__clearEvents.push({
        timestamp: now,
        videoTime: currentVideoTime,
        absoluteTime: now
      });
      
      console.log(`Stored ${hiddenDrawings.length} hidden drawings and added clear event at ${currentVideoTime}ms`);
    }
    
    // Behavior now more consistent between modes
    if (isReplaying) {
      // In replay, update visibility state but keep annotations for history
      setAllDrawings(hiddenDrawings);
      console.log(`REPLAY: Marked ${hiddenDrawings.length} drawings as hidden at ${currentVideoTime}ms`);
    } else {
      // In recording, still clear array for performance
      setAllDrawings([]);
      console.log(`RECORD: Cleared ${hiddenDrawings.length} drawings from display at ${currentVideoTime}ms`);
    }
    
    return clearMark;
  };

  // Listen for external clear command
  useEffect(() => {
    if (clearCanvas) {
      // Execute the clear canvas operation and get the result
      const result = clearCanvasDrawings();
      
      console.log('Clear canvas command received, cleared drawings with result:', result);
      
      // Store clear event information globally for cross-component access
      if (typeof window !== 'undefined') {
        const now = Date.now();
        const videoTimeMs = currentTime * 1000;
        
        // Add to window.__clearEvents array (used by annotation filtering)
        window.__clearEvents = window.__clearEvents || [];
        window.__clearEvents.push({
          timestamp: now,
          videoTime: videoTimeMs,
          absoluteTime: now
        });
        
        console.log(`Added clear event to window.__clearEvents, video time: ${videoTimeMs}ms`);
      }
      
      // Notify parent component that clearing is complete
      if (onClearComplete) {
        onClearComplete();
      }
    }
  }, [clearCanvas, onClearComplete, currentTime]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height]);

  // Handle drawing a path
  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    
    ctx.moveTo(path.points[0].x, path.points[0].y);
    
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    
    ctx.stroke();
  };

  // Track clear events during replay
  const [clearEvents, setClearEvents] = useState<number[]>([]);
  
  // Reference to all clear events including from window storage
  const allClearEventsRef = useRef<number[]>([]);
  
  // Process replay annotations to track clear events
  useEffect(() => {
    if (!isReplaying || replayAnnotations.length === 0) return;
    
    // Find all clear events by their timestamps or isClearEvent flag
    const clearTimestamps: number[] = [];
    const clearEvents: Record<number, any> = {};
    
    console.log('Examining all annotations for clear events:', replayAnnotations.length);
    
    // First look for any clear actions that might be in the annotations array
    replayAnnotations.forEach((annotation, index) => {
      // Standardized detection of clear events using multiple possible formats
      const isClearEvent = annotation.isClearEvent === true;
      const clearDetails = (annotation as any).details?.clear === true;
      const isExplicitClear = annotation.points?.length === 0 && annotation.hiddenAt;
      
      if (isClearEvent || clearDetails || isExplicitClear) {
        // Log only the first few events to avoid console spam
        if (index < 5) {
          console.log(`Found clear event candidate in annotation ${index}:`, annotation);
        }
        
        // Try to extract timestamp from various properties in order of reliability
        let clearTime = 0;
        
        // 1. Use clearVideoTime from various locations (most reliable)
        if (annotation.clearVideoTime) {
          clearTime = annotation.clearVideoTime;
        }
        else if ((annotation as any).details?.clearVideoTime) {
          clearTime = (annotation as any).details.clearVideoTime;
        }
        // 2. Try hiddenAt timestamp (for explicitly hidden annotations)
        else if (annotation.hiddenAt) {
          clearTime = annotation.hiddenAt;
        }
        // 3. Use various timestamp properties
        else if (annotation.clearTimestamp) {
          clearTime = annotation.clearTimestamp;
        }
        else if ((annotation as any).details?.clearTimestamp) {
          clearTime = (annotation as any).details.clearTimestamp;
        }
        // 4. Fall back to standard timing properties as last resort
        else {
          clearTime = (annotation as any).timeOffset 
            || annotation.videoTime 
            || annotation.timestamp;
        }
        
        if (clearTime) {
          // Apply a small negative offset to ensure clear events happen
          // slightly before the next annotation in the timeline
          // This helps fix the "one event behind" playback issue
          const adjustedClearTime = clearTime - 10; // 10ms earlier
          
          // Round to nearest 10ms to handle slight timing differences
          const roundedClearTime = Math.round(adjustedClearTime / 10) * 10;
          clearTimestamps.push(roundedClearTime);
          
          // Store the full clear event for reference
          clearEvents[roundedClearTime] = annotation;
          
          if (index < 5) {
            console.log(`Found clear event at timestamp: ${roundedClearTime}ms (adjusted from ${clearTime}ms)`);
          }
        }
      }
    });
    
    // Also check for hidden annotations from window storage (recording mode)
    if (typeof window !== 'undefined' && window.__hiddenAnnotations?.length > 0) {
      console.log(`Found ${window.__hiddenAnnotations.length} hidden annotations in window storage`);
      
      window.__hiddenAnnotations.forEach(annotation => {
        if (annotation.hiddenAt) {
          // Apply the same adjustment as above to ensure consistency
          const adjustedClearTime = annotation.hiddenAt - 10; // 10ms earlier
          const clearTime = Math.round(adjustedClearTime / 10) * 10;
          
          if (!clearTimestamps.includes(clearTime)) {
            clearTimestamps.push(clearTime);
            console.log(`Added clear event from window storage at ${clearTime}ms (adjusted from ${annotation.hiddenAt}ms)`);
          }
        }
      });
    }
    
    // Log summary of what we found
    if (clearTimestamps.length > 0) {
      console.log(`Found ${clearTimestamps.length} clear events`);
    } else {
      console.warn('No clear events found in replay annotations!');
    }
    
    // Sort by time
    clearTimestamps.sort((a, b) => a - b);
    
    if (clearTimestamps.length > 0) {
      console.log(`Clear events detected at: ${clearTimestamps.slice(0, 5).join(', ')}${clearTimestamps.length > 5 ? '...' : ''}`);
    }
    
    // Update state only if there's a change to avoid extra renders
    if (clearTimestamps.length !== clearEvents.length || 
        clearTimestamps.some((t, i) => t !== clearEvents[i])) {
      setClearEvents(clearTimestamps);
    }
  }, [isReplaying, replayAnnotations]);
  
  // Helper function for visibility filtering as recommended
  const getVisibleAnnotations = (annotations: DrawingPath[], videoTimeMs: number, clearTimes: number[]) => {
    // Find most recent clear event
    const mostRecentClearTime = clearTimes.length > 0 
      ? Math.max(0, ...clearTimes.filter(time => time <= videoTimeMs)) 
      : 0;
    
    return annotations.filter(annotation => {
      // Skip clear events and non-drawings
      if (annotation.isClearEvent || !annotation.points || annotation.points.length === 0) {
        return false;
      }
      
      // Skip explicitly hidden annotations
      if (annotation.visible === false) {
        return false;
      }
      
      // Skip annotations hidden at an earlier time
      if (annotation.hiddenAt && annotation.hiddenAt <= videoTimeMs) {
        return false;
      }
      
      // Get the creation time with fallbacks
      const annotationTime = (annotation as any).timeOffset || 
                          annotation.videoTime || 
                          annotation.timestamp || 
                          0;
      
      // Check against the most recent clear event
      if (mostRecentClearTime > 0 && annotationTime <= mostRecentClearTime) {
        return false;
      }
      
      // Only show annotations created before current time
      return annotationTime <= videoTimeMs;
    });
  };

  // Draw annotations during replay
  useEffect(() => {
    if (!isReplaying || replayAnnotations.length === 0) return;
    
    const ctx = getContext();
    if (!ctx) return;
    
    // Clear canvas before drawing
    ctx.clearRect(0, 0, width, height);
    
    // Draw all annotations that should be visible at the current time
    // Use the video's currentTime (in seconds) to determine which annotations to show
    const videoTimeMs = currentTime * 1000; // Convert to milliseconds
    
    // Also check window storage for clear events
    if (typeof window !== 'undefined' && window.__clearEvents?.length > 0) {
      // Add any clear events from window storage that aren't already in clearEvents
      const windowClearTimes = window.__clearEvents.map(e => e.videoTime);
      
      // Update allClearEventsRef with combined clear events
      const combinedClearEvents = [...clearEvents];
      
      windowClearTimes.forEach(clearTime => {
        if (!combinedClearEvents.includes(clearTime)) {
          combinedClearEvents.push(clearTime);
        }
      });
      
      // Sort and update the reference
      combinedClearEvents.sort((a, b) => a - b);
      allClearEventsRef.current = combinedClearEvents;
      
      if (combinedClearEvents.length !== clearEvents.length && videoTimeMs % 1000 === 0) {
        console.log(`Using ${combinedClearEvents.length} clear events (${clearEvents.length} from state + ${windowClearTimes.length} from window storage)`);
      }
    } else {
      // Just use the state-based clear events
      allClearEventsRef.current = [...clearEvents];
    }
    
    // Combine replay annotations with any hidden annotations from recording
    let combinedAnnotations = [...replayAnnotations];
    
    // Include hidden annotations from window storage if available
    if (typeof window !== 'undefined' && window.__hiddenAnnotations?.length > 0) {
      combinedAnnotations = [...combinedAnnotations, ...window.__hiddenAnnotations];
    }
    
    // Use the simplified helper function to get visible annotations
    const visibleAnnotations = getVisibleAnnotations(
      combinedAnnotations, 
      videoTimeMs, 
      allClearEventsRef.current
    );
    
    // Log some stats about what we're showing (only once per second)
    if (videoTimeMs % 1000 === 0) {
      if (visibleAnnotations.length > 0) {
        console.log(`Showing ${visibleAnnotations.length} of ${combinedAnnotations.length} annotations at ${videoTimeMs}ms`);
      } else {
        console.log(`No annotations to show at ${videoTimeMs}ms (${combinedAnnotations.length} total annotations)`);
      }
    }
    
    // Draw the visible annotations
    visibleAnnotations.forEach(path => {
      drawPath(ctx, path);
    });
  }, [isReplaying, replayAnnotations, currentTime, width, height, clearEvents]);

  // Draw all stored paths
  useEffect(() => {
    if (isReplaying) return; // Don't draw local paths during replay
    
    const ctx = getContext();
    if (!ctx) return;
    
    // Clear canvas before drawing
    ctx.clearRect(0, 0, width, height);
    
    // Draw all stored paths
    allDrawings.forEach(path => {
      drawPath(ctx, path);
    });
  }, [allDrawings, isReplaying, width, height]);

  // Method to handle an annotation that was generated programmatically
  const handleManualAnnotation = (path: DrawingPath) => {
    // Ensure the annotation has a unique ID
    const id = path.id || `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get precise timing information
    const now = Date.now();
    const videoTimeMs = path.videoTime || (currentTime * 1000);
    
    // Log additional timing information for debugging
    console.log('Handling manual annotation:', {
      id,
      points: path.points?.length || 0,
      videoTime: videoTimeMs,
      timestamp: path.timestamp || now,
      timeOffset: (path as any).timeOffset,
      currentVideoTime: currentTime * 1000
    });
    
    // Ensure annotation has complete and consistent metadata
    const enhancedAnnotation: DrawingPath = {
      ...path,
      id,
      visible: true, // Explicitly set to visible
      timestamp: path.timestamp || now,
      videoTime: videoTimeMs,
      // Add any missing required properties based on interface
      points: path.points || [],
      color: path.color || toolColor,
      width: path.width || toolWidth,
      // Handle special cases for clear events
      isClearEvent: path.isClearEvent || false,
      hiddenAt: path.hiddenAt || undefined
    };
    
    // If this is a clear event, make sure we register it globally for
    // consistent cross-component access
    if (enhancedAnnotation.isClearEvent && typeof window !== 'undefined') {
      window.__clearEvents = window.__clearEvents || [];
      window.__clearEvents.push({
        timestamp: enhancedAnnotation.timestamp,
        videoTime: enhancedAnnotation.videoTime,
        absoluteTime: enhancedAnnotation.timestamp
      });
      
      console.log(`Registered manual clear event at video time: ${enhancedAnnotation.videoTime}ms`);
    }
    
    // Add annotation to local state
    setAllDrawings(prev => [...prev, enhancedAnnotation]);
    
    // Report the annotation if we're recording
    if (isRecording && onAnnotationAdded) {
      // Pass the fully enhanced annotation with all metadata
      onAnnotationAdded(enhancedAnnotation);
    }
    
    return enhancedAnnotation;
  };

  // Event handlers for drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isReplaying) return; // Drawing is always enabled, only check for replay mode
    
    setIsDrawing(true);
    setCurrentPath([]);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setCurrentPath([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isReplaying) return; // Drawing is always enabled
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      
      // Prevent scrolling while drawing
      e.preventDefault();
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setCurrentPath(prev => [...prev, { x, y }]);
    
    const ctx = getContext();
    if (ctx && currentPath.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = toolColor;
      ctx.lineWidth = toolWidth;
      
      const lastPoint = currentPath[currentPath.length - 1];
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const endDrawing = () => {
    if (!isDrawing || isReplaying) return; // Drawing is always enabled
    
    setIsDrawing(false);
    
    if (currentPath.length > 1) {
      // Generate a unique ID for this annotation
      const id = `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      const videoTimeMs = currentTime * 1000;
      
      // Create a new annotation with complete metadata
      const newPath: DrawingPath = {
        points: [...currentPath],
        color: toolColor,
        width: toolWidth,
        timestamp: now,
        id,
        visible: true,
        videoTime: videoTimeMs
      };
      
      // Add to local drawings for immediate display
      setAllDrawings(prev => [...prev, newPath]);
      
      // Report the annotation if we're recording
      if (isRecording && onAnnotationAdded) {
        // Include complete metadata
        const annotationWithMetadata = {
          ...newPath,
          timeOffset: now - (recordingStartTimeRef.current || now)
        };
        onAnnotationAdded(annotationWithMetadata);
        
        console.log(`Created annotation with ID ${id} at video time ${videoTimeMs}ms`);
      }
    }
    
    setCurrentPath([]);
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    // Core canvas ref and state
    canvasRef,
    allDrawings,
    
    // Canvas utility methods
    getContext: () => getContext(),
    
    // Drawing manipulation methods
    clearCanvasDrawings: () => {
      console.log('AnnotationCanvas: Clearing all drawings');
      clearCanvasDrawings();
    },
    
    handleManualAnnotation: (path: DrawingPath) => {
      console.log('AnnotationCanvas: Handling manual annotation:', {
        pointsCount: path.points?.length || 0,
        color: path.color,
        width: path.width,
        videoTime: path.videoTime
      });
      handleManualAnnotation(path);
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 z-10 cursor-crosshair"
      width={width}
      height={height}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={endDrawing}
    />
  );
});

AnnotationCanvas.displayName = 'AnnotationCanvas';

export default AnnotationCanvas;