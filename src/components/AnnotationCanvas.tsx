'use client';

import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';

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
    
    // Draw all annotations that should be visible at the current time
    // Use the video's currentTime (in seconds) to determine which annotations to show
    const videoTimeMs = currentTime * 1000; // Convert to milliseconds
    
    // More comprehensive logic for determining which annotations to show
    const visibleAnnotations = replayAnnotations.filter(annotation => {
      // Check for explicit timeOffset (added by FeedbackOrchestrator)
      if ((annotation as any).timeOffset !== undefined) {
        const timeOffset = (annotation as any).timeOffset;
        console.log(`Annotation with timeOffset: ${timeOffset}ms, current: ${videoTimeMs}ms`, {
          visible: timeOffset <= videoTimeMs,
          difference: videoTimeMs - timeOffset
        });
        return timeOffset <= videoTimeMs;
      }
      
      // Next check videoTime (relative to video timeline)
      if (annotation.videoTime !== undefined) {
        console.log(`Annotation with videoTime: ${annotation.videoTime}ms, current: ${videoTimeMs}ms`, {
          visible: annotation.videoTime <= videoTimeMs
        });
        return annotation.videoTime <= videoTimeMs;
      }
      
      // Fallback to timestamp (original recording time)
      console.log(`Annotation with timestamp: ${annotation.timestamp}ms, current: ${videoTimeMs}ms`, {
        visible: annotation.timestamp <= videoTimeMs
      });
      return annotation.timestamp <= videoTimeMs;
    });
    
    if (visibleAnnotations.length > 0) {
      console.log(`Showing ${visibleAnnotations.length} of ${replayAnnotations.length} annotations at ${videoTimeMs}ms`);
    }
    
    visibleAnnotations.forEach(path => {
      drawPath(ctx, path);
    });
  }, [isReplaying, replayAnnotations, currentTime, width, height]);

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