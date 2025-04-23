'use client';

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useTimeline, useLastClearTime } from '../contexts/TimelineContext';

export interface Point {
  x: number;
  y: number;
}

export type DrawingTool = 'freehand' | 'line';

export interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
  timestamp: number;
  videoTime?: number; // Time in the video when this annotation was created (in ms)
  tool?: DrawingTool; // The tool used to create this drawing
}

interface AnnotationCanvasProps {
  width: number;
  height: number;
  _isEnabled?: boolean; // Renamed with _ prefix to indicate it's not used
  currentTime: number;
  isRecording?: boolean;
  isReplaying?: boolean;
  onAnnotationAdded?: (path: DrawingPath) => void;
  replayAnnotations?: DrawingPath[];
  toolColor?: string;
  toolWidth?: number;
  toolType?: DrawingTool;
  clearCanvas?: boolean;
  onClearComplete?: () => void;
}

// Define the ref interface to expose methods to parent components
interface AnnotationCanvasRef {
  handleManualAnnotation: (path: DrawingPath) => void;
  clearCanvasDrawings: () => void;
}

const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>(({
  width,
  height,
  _isEnabled,
  currentTime,
  isRecording = false,
  isReplaying = false,
  onAnnotationAdded,
  replayAnnotations = [],
  toolColor = '#ffff00',
  toolWidth = 1,
  toolType = 'freehand',
  clearCanvas = false,
  onClearComplete
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [allDrawings, setAllDrawings] = useState<DrawingPath[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  
  // Get timeline context
  const { state: { currentPosition: globalTimePosition } } = useTimeline();
  const { lastClearTime } = useLastClearTime();
  
  // Get canvas context in a memoized way
  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return ctx;
  }, [canvasRef]);

  // Clear the canvas
  const clearCanvasDrawings = useCallback(() => {
    console.log('AnnotationCanvas: Starting canvas clear operation');
    const ctx = getContext();
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      console.log('AnnotationCanvas: Canvas context cleared');
    }
    setAllDrawings([]);
    
    // Return a promise that resolves when the state update is likely complete
    return new Promise<void>(resolve => {
      // Use requestAnimationFrame to wait for the next frame after state update
      requestAnimationFrame(() => {
        console.log('AnnotationCanvas: Canvas clear state update processed');
        resolve();
      });
    });
  }, [getContext, width, height]);

  // Listen for external clear command
  useEffect(() => {
    if (clearCanvas) {
      // Use requestAnimationFrame to ensure we're in a proper animation frame
      requestAnimationFrame(() => {
        // Clear the canvas and wait for completion
        clearCanvasDrawings()
          .then(() => {
            // Use another requestAnimationFrame to ensure the clearing has been rendered
            requestAnimationFrame(() => {
              // Now that the canvas is definitely cleared, notify the parent
              if (onClearComplete) {
                console.log('AnnotationCanvas: Canvas clearing complete, notifying parent');
                onClearComplete();
              }
            });
          })
          .catch(err => {
            console.error('Error during canvas clearing:', err);
            // Still call the completion handler even if there was an error
            if (onClearComplete) {
              onClearComplete();
            }
          });
      });
    }
  }, [clearCanvas, onClearComplete, clearCanvasDrawings]);

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
  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (!path || !path.points || path.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    
    // For line tool with just two points, draw a straight line
    if (path.tool === 'line' && path.points.length === 2) {
      const [start, end] = path.points;
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    } else {
      // For freehand or legacy paths, draw all points
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
    }
    
    ctx.stroke();
  }, []);

  // Draw annotations during replay
  useEffect(() => {
    // Only run this effect when replaying
    if (!isReplaying) return;
    
    console.log("REPLAY EFFECT RUNNING", {
      isReplaying,
      annotationsCount: replayAnnotations?.length || 0,
      globalTimePosition
    });
    
    const ctx = getContext();
    if (!ctx) {
      console.error("Failed to get canvas context for annotation replay");
      return;
    }
    
    // Clear canvas before drawing
    ctx.clearRect(0, 0, width, height);
    
    // Exit early if no annotations to draw
    if (!replayAnnotations || replayAnnotations.length === 0) {
      console.log("No annotations to replay");
      return;
    }
    
    // Always log the annotation data once to diagnose issues
    if (Math.random() < 0.1) {
      console.log("Annotation replay data:", 
        replayAnnotations.slice(0, 2).map(a => ({
          hasPoints: Boolean(a?.points),
          pointsLength: a?.points?.length,
          globalTimeOffset: (a as any).globalTimeOffset,
          timeOffset: (a as any).timeOffset,
          videoTime: a.videoTime,
          timestamp: a.timestamp
        }))
      );
    }
    
    // Also track video time for debugging
    const videoTimeMs = currentTime * 1000; // Convert to milliseconds
    
    // Log global timeline information periodically (every second)
    if (Math.floor(globalTimePosition / 1000) !== Math.floor((globalTimePosition - 100) / 1000)) {
      console.log(`Annotation replay: Global time: ${globalTimePosition}ms, Last clear: ${lastClearTime}ms, Annotations: ${replayAnnotations.length}`);
    }
    
    // First, filter annotations to only include those created after the last clear
    // This ensures "clear" actions are properly respected during replay
    const visibleAnnotations = replayAnnotations.filter(annotation => {
      if (!annotation || !annotation.points || annotation.points.length < 2) {
        return false; // Skip invalid annotations
      }
      
      // First, check if this annotation has globalTimeOffset and if it came after the last clear
      if ((annotation as any).globalTimeOffset !== undefined) {
        const globalTimeOffset = (annotation as any).globalTimeOffset;
        
        // Skip annotations that were drawn before the last clear
        if (globalTimeOffset <= lastClearTime) {
          return false;
        }
        
        // Now check if this annotation should be visible at the current timeline position
        const isVisible = globalTimeOffset <= globalTimePosition;
        
        if (Math.random() < 0.01) { // Reduce logging frequency
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
    
    // Always log when we have visible annotations
    if (visibleAnnotations.length > 0) {
      console.log(`Showing ${visibleAnnotations.length} of ${replayAnnotations.length} annotations at global time ${globalTimePosition}ms`);
      
      // Draw each visible annotation
      visibleAnnotations.forEach(path => {
        console.log("Drawing path:", {
          points: path.points?.length,
          color: path.color,
          width: path.width,
          tool: path.tool || 'freehand'
        });
        
        // Ensure tool type is set for backwards compatibility
        if (!path.tool) {
          path.tool = 'freehand';
        }
        
        drawPath(ctx, path);
      });
    } else if (Math.random() < 0.1) {
      console.log(`No visible annotations at time ${globalTimePosition}ms (of ${replayAnnotations.length} total)`);
    }
  }, [isReplaying, replayAnnotations, currentTime, width, height, globalTimePosition, lastClearTime, getContext, drawPath]);

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
  }, [allDrawings, isReplaying, width, height, drawPath, getContext]);

  // Method to handle an annotation that was generated programmatically
  const handleManualAnnotation = (path: DrawingPath) => {
    // Log additional timing information for debugging
    console.log('Handling manual annotation:', {
      path: path,
      points: path.points?.length || 0,
      videoTime: path.videoTime || 'not set',
      timestamp: path.timestamp || 'not set',
      timeOffset: (path as { timeOffset?: number }).timeOffset || 'not set',
      currentVideoTime: currentTime * 1000,
      tool: path.tool || 'freehand' // Default to freehand if not specified
    });
    
    // Make sure tool type is set
    const completePath = {
      ...path,
      tool: path.tool || 'freehand'
    };
    
    // Add to local drawings - preserve the original path with all timing information
    setAllDrawings(prev => [...prev, completePath]);
    
    // Report the annotation if we're recording
    if (isRecording && onAnnotationAdded) {
      onAnnotationAdded(completePath);
    }
  };

  // Get mouse/touch position in canvas coordinates
  const getPointerPosition = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

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

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Draw temporary straight line during line tool usage
  const drawTemporaryLine = (start: Point, end: Point) => {
    const ctx = getContext();
    if (!ctx) return;

    // Clear canvas before redrawing
    ctx.clearRect(0, 0, width, height);
    
    // Redraw all existing paths
    allDrawings.forEach(path => {
      drawPath(ctx, path);
    });
    
    // Draw the temporary line
    ctx.beginPath();
    ctx.strokeStyle = toolColor;
    ctx.lineWidth = toolWidth;
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };

  // Event handlers for drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isReplaying) return; // Drawing is always enabled, only check for replay mode
    
    setIsDrawing(true);
    setCurrentPath([]);

    const position = getPointerPosition(e);
    if (!position) return;
    
    // For line tool, just save the start point
    if (toolType === 'line') {
      setStartPoint(position);
      setCurrentPath([position]);
    } else {
      // For freehand, start the path
      setCurrentPath([position]);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isReplaying) return; // Drawing is always enabled
    
    if ('touches' in e) {
      // Prevent scrolling while drawing
      e.preventDefault();
    }

    const position = getPointerPosition(e);
    if (!position) return;
    
    if (toolType === 'line' && startPoint) {
      // For line tool, continuously update the preview without adding points
      drawTemporaryLine(startPoint, position);
      // Update current path to track the current end position
      setCurrentPath([startPoint, position]);
    } else {
      // For freehand, add point to path and draw incremental line segment
      setCurrentPath(prev => [...prev, position]);
      
      const ctx = getContext();
      if (ctx && currentPath.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = toolColor;
        ctx.lineWidth = toolWidth;
        
        const lastPoint = currentPath[currentPath.length - 1];
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(position.x, position.y);
        ctx.stroke();
      }
    }
  };

  const endDrawing = () => {
    if (!isDrawing || isReplaying) return; // Drawing is always enabled
    
    setIsDrawing(false);
    
    if (toolType === 'line' && startPoint) {
      // For line tool, create a path with just the start and end points
      if (currentPath.length === 2) {
        const endPosition = currentPath[1];
        
        // Only create a line if the end position is different from the start
        if (endPosition.x !== startPoint.x || endPosition.y !== startPoint.y) {
          const newPath: DrawingPath = {
            points: [startPoint, endPosition],
            color: toolColor,
            width: toolWidth,
            timestamp: Date.now(),
            tool: 'line'
          };
          
          // Draw the final line
          const ctx = getContext();
          if (ctx) {
            ctx.beginPath();
            ctx.strokeStyle = newPath.color;
            ctx.lineWidth = newPath.width;
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(endPosition.x, endPosition.y);
            ctx.stroke();
          }
          
          setAllDrawings(prev => [...prev, newPath]);
          
          // Report the annotation if we're recording
          if (isRecording && onAnnotationAdded) {
            onAnnotationAdded(newPath);
          }
          
          console.log('Created line from', startPoint, 'to', endPosition);
        }
      }
      setStartPoint(null);
    } else if (currentPath.length > 1) {
      // For freehand, create path with all points
      const newPath: DrawingPath = {
        points: [...currentPath],
        color: toolColor,
        width: toolWidth,
        timestamp: Date.now(),
        tool: 'freehand'
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
    
    // New state-based reset method that bypasses the timeline completely
    resetCanvas: () => {
      console.log('AnnotationCanvas: Complete state-based canvas reset');
      
      // Use double requestAnimationFrame for reliable clearing
      requestAnimationFrame(() => {
        // Clear the physical canvas
        const ctx = getContext();
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
        }
        
        // Reset all internal state
        setAllDrawings([]);
        setCurrentPath([]);
        setIsDrawing(false);
        
        // Force a second redraw in the next animation frame to ensure rendering
        requestAnimationFrame(() => {
          const ctx = getContext();
          if (ctx) {
            ctx.clearRect(0, 0, width, height);
            console.log('AnnotationCanvas: Second clearing pass complete');
          }
        });
      });
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