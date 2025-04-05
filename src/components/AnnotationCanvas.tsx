'use client';

import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useTimeline, useLastClearTime } from '../contexts/TimelineContext';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
  timestamp: number;
  videoTime?: number; // Time in the video when this annotation was created (in ms)
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
  
  // Get timeline context
  const { state: { currentPosition: globalTimePosition } } = useTimeline();
  const { lastClearTime } = useLastClearTime();
  
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
    setAllDrawings([]);
  };

  // Listen for external clear command
  useEffect(() => {
    if (clearCanvas) {
      clearCanvasDrawings();
      if (onClearComplete) {
        onClearComplete();
      }
    }
  }, [clearCanvas, onClearComplete]);

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

  // Draw annotations during replay
  useEffect(() => {
    if (!isReplaying || replayAnnotations.length === 0) return;
    
    const ctx = getContext();
    if (!ctx) return;
    
    // Clear canvas before drawing
    ctx.clearRect(0, 0, width, height);
    
    // Also track video time for debugging
    const videoTimeMs = currentTime * 1000; // Convert to milliseconds
    
    // Log global timeline information periodically
    if (Math.floor(globalTimePosition / 1000) !== Math.floor((globalTimePosition - 100) / 1000)) {
      console.log(`Annotation replay: Global time: ${globalTimePosition}ms, Last clear: ${lastClearTime}ms`);
    }
    
    // First, filter annotations to only include those created after the last clear
    // This ensures "clear" actions are properly respected during replay
    const visibleAnnotations = replayAnnotations.filter(annotation => {
      // First, check if this annotation has globalTimeOffset and if it came after the last clear
      if ((annotation as any).globalTimeOffset !== undefined) {
        const globalTimeOffset = (annotation as any).globalTimeOffset;
        
        // Skip annotations that were drawn before the last clear
        if (globalTimeOffset <= lastClearTime) {
          return false;
        }
        
        // Now check if this annotation should be visible at the current timeline position
        const isVisible = globalTimeOffset <= globalTimePosition;
        
        if (Math.random() < 0.05) { // Only log a small percentage to reduce console spam
          console.log(`Annotation with globalTimeOffset: ${globalTimeOffset}ms at time: ${globalTimePosition}ms, lastClear: ${lastClearTime}ms`, {
            visible: isVisible,
            afterClear: globalTimeOffset > lastClearTime,
            videoTime: videoTimeMs
          });
        }
        
        return isVisible;
      }
      
      // Next check for explicit timeOffset (added by FeedbackOrchestrator)
      if ((annotation as any).timeOffset !== undefined) {
        const timeOffset = (annotation as any).timeOffset;
        
        // Skip annotations drawn before the last clear
        if (timeOffset <= lastClearTime) {
          return false;
        }
        
        const isVisible = timeOffset <= globalTimePosition;
        return isVisible;
      }
      
      // For legacy annotations without proper global timing, use video time
      // This is just a fallback for backward compatibility
      if (annotation.videoTime !== undefined) {
        return annotation.videoTime <= videoTimeMs;
      }
      
      // Last fallback to timestamp (original recording time)
      return annotation.timestamp <= videoTimeMs;
    });
    
    if (visibleAnnotations.length > 0 && Math.random() < 0.1) { // Reduce logging frequency
      console.log(`Showing ${visibleAnnotations.length} of ${replayAnnotations.length} annotations at global time ${globalTimePosition}ms`);
    }
    
    visibleAnnotations.forEach(path => {
      drawPath(ctx, path);
    });
  }, [isReplaying, replayAnnotations, currentTime, width, height, globalTimePosition, lastClearTime]);

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
    // Log additional timing information for debugging
    console.log('Handling manual annotation:', {
      path: path,
      points: path.points?.length || 0,
      videoTime: path.videoTime || 'not set',
      timestamp: path.timestamp || 'not set',
      timeOffset: (path as any).timeOffset || 'not set',
      currentVideoTime: currentTime * 1000
    });
    
    // Add to local drawings - preserve the original path with all timing information
    setAllDrawings(prev => [...prev, path]);
    
    // Report the annotation if we're recording
    if (isRecording && onAnnotationAdded) {
      onAnnotationAdded(path);
    }
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
      const newPath: DrawingPath = {
        points: [...currentPath],
        color: toolColor,
        width: toolWidth,
        timestamp: Date.now()
      };
      
      setAllDrawings(prev => [...prev, newPath]);
      
      // Report the annotation if we're recording
      if (isRecording && onAnnotationAdded) {
        onAnnotationAdded(newPath);
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