'use client';

import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useTimeline, useTimelinePosition, useAnnotation, useAnnotationActions, useVisibleAnnotations } from '@/state';

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
  isEnabled: boolean;
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

const AnnotationCanvas = forwardRef<any, AnnotationCanvasProps>(({
  width,
  height,
  isEnabled,
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
  // Get state from context
  const timelineState = useTimeline();
  const { position: timelinePosition } = useTimelinePosition();
  const annotationState = useAnnotation();
  const annotationActions = useAnnotationActions();
  
  // Get annotations from state or props
  const stateAnnotations = useVisibleAnnotations(timelinePosition);

  // Internal state for drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  // Use state annotations if available, otherwise use local state
  const [localAnnotations, setLocalAnnotations] = useState<DrawingPath[]>([]);
  const annotations = isReplaying ? replayAnnotations : stateAnnotations.length > 0 ? stateAnnotations : localAnnotations;
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  
  // Use last clear time from state if available
  const lastClearTime = annotationState.lastClearTime || 0;

  // Use timelinePosition if currentTime is not directly provided
  const effectiveCurrentTime = currentTime || timelinePosition;

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Clear canvas when requested
  useEffect(() => {
    if (clearCanvas) {
      clearCanvasDrawings();
      if (onClearComplete) {
        onClearComplete();
      }
    }
  }, [clearCanvas, onClearComplete]);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    clearCanvasDrawings,
    handleManualAnnotation
  }));

  // Clear all annotations from the canvas
  const clearCanvasDrawings = useCallback(() => {
    if (effectiveCurrentTime) {
      // Update state with the current clear time
      annotationActions.setLastClearTime(effectiveCurrentTime);
      annotationActions.clearPaths(effectiveCurrentTime);
    }
    
    // Also clear local annotations and redraw empty canvas
    setLocalAnnotations([]);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
  }, [width, height, effectiveCurrentTime, annotationActions]);

  // Add a manual annotation (used for replay)
  const handleManualAnnotation = useCallback((path: DrawingPath) => {
    if (!isReplaying) {
      // Add to shared state if not in replay mode
      annotationActions.addAnnotation(path);
    }
    // Also maintain local state for backward compatibility
    setLocalAnnotations(prev => [...prev, path]);
  }, [annotationActions, isReplaying]);

  // Handle mouse down / touch start
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isEnabled || isReplaying) return;
    
    // Prevent scrolling on touch devices while drawing
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }
    
    // Start a new drawing path
    setIsDrawing(true);
    
    // Get canvas-relative coordinates
    const canvasRect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    
    setCurrentPath([{ x, y }]);
    
    // Start drawing on the canvas
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = toolColor;
      ctx.lineWidth = toolWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isEnabled, isReplaying, toolColor, toolWidth]);

  // Handle mouse move / touch move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !isEnabled || isReplaying) return;
    
    // Prevent scrolling on touch devices while drawing
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }
    
    // Get canvas-relative coordinates
    const canvasRect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    
    // Add point to current path
    setCurrentPath(prev => [...prev, { x, y }]);
    
    // Draw line on canvas
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, [isDrawing, isEnabled, isReplaying]);

  // Handle mouse up / touch end
  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !isEnabled || isReplaying) return;
    
    // End drawing
    setIsDrawing(false);
    
    if (currentPath.length > 0) {
      // Create new annotation
      const newPath: DrawingPath = {
        points: [...currentPath],
        color: toolColor,
        width: toolWidth,
        timestamp: Date.now(),
        videoTime: effectiveCurrentTime,
        tool: toolType
      };
      
      // Add to state system
      annotationActions.addAnnotation(newPath);
      
      // Also maintain local state for backward compatibility
      setLocalAnnotations(prev => [...prev, newPath]);
      
      // Notify parent component
      if (onAnnotationAdded && isRecording) {
        onAnnotationAdded(newPath);
      }
      
      // Reset current path
      setCurrentPath([]);
    }
  }, [isDrawing, isEnabled, isReplaying, currentPath, toolColor, toolWidth, effectiveCurrentTime, toolType, onAnnotationAdded, isRecording, annotationActions]);

  // Handle pointer cancel
  const handlePointerCancel = useCallback(() => {
    setIsDrawing(false);
    setCurrentPath([]);
  }, []);

  // Handle pointer leave - only end drawing on desktop
  const handlePointerLeave = useCallback(() => {
    if (!isTouchDevice) {
      handlePointerUp();
    }
  }, [isTouchDevice, handlePointerUp]);

  // Apply replay annotations
  useEffect(() => {
    if (replayAnnotations.length > 0 && isReplaying) {
      // Filter annotations for the current time (in replay mode)
      // This should match the logic in the parent component
      const currentTimeMs = effectiveCurrentTime;
      
      // Reset annotations on first frame of replay
      if (currentTimeMs === 0 || currentTimeMs === undefined) {
        setAnnotations([]);
      }
      
      // Find annotations that should be visible at this time
      const annotationsToAdd = replayAnnotations.filter(anno => {
        // Prefer timeOffset for replay (added by parent component)
        const annotationTime = (anno as any).timeOffset || (anno as any).globalTimeOffset || anno.videoTime;
        // Use timestamp as a fallback
        return annotationTime !== undefined && annotationTime <= currentTimeMs;
      });
      
      // Update annotations state if we have valid ones
      if (annotationsToAdd.length > 0) {
        setAnnotations(annotationsToAdd);
      }
    }
  }, [replayAnnotations, isReplaying, effectiveCurrentTime]);

  // Redraw annotations when they change or when canvas size changes
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Only show annotations created after the last clear time
    const visibleAnnotations = annotations.filter(anno => {
      // Get the appropriate time value
      const annotationTime = (anno as any).timeOffset || (anno as any).globalTimeOffset || anno.videoTime || anno.timestamp;
      return annotationTime > lastClearTime;
    });
    
    // Draw all visible annotations
    visibleAnnotations.forEach(path => {
      if (path.points.length < 2) return;
      
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Move to first point
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      // Draw lines to all other points
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      
      // Stroke the path
      ctx.stroke();
    });
  }, [annotations, width, height, lastClearTime]);

  // These pointer events work for both mouse and touch
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute top-0 left-0 ${isEnabled ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ 
        touchAction: 'none', // Prevent browser handling of touches
        opacity: 0.8
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
    />
  );
});

AnnotationCanvas.displayName = 'AnnotationCanvas';

export default AnnotationCanvas;