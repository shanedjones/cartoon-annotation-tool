'use client';
import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
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
  videoTime?: number;
  tool?: DrawingTool;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [allDrawings, setAllDrawings] = useState<DrawingPath[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const { state: { currentPosition: globalTimePosition } } = useTimeline();
  const { lastClearTime } = useLastClearTime();
  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return ctx;
  }, [canvasRef]);
  const clearCanvasDrawings = useCallback(() => {
    const ctx = getContext();
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
    setAllDrawings([]);
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  }, [getContext, width, height]);
  useEffect(() => {
    if (clearCanvas) {
      requestAnimationFrame(() => {
        clearCanvasDrawings()
          .then(() => {
            requestAnimationFrame(() => {
              if (onClearComplete) {
                onClearComplete();
              }
            });
          })
          .catch(err => {
            if (onClearComplete) {
              onClearComplete();
            }
          });
      });
    }
  }, [clearCanvas, onClearComplete]);
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
  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (!path || !path.points || path.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    if (path.tool === 'line' && path.points.length === 2) {
      const [start, end] = path.points;
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
    } else {
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
    }
    ctx.stroke();
  }, []);
  // Memoize the visible annotations calculation for better performance
  const visibleAnnotations = useMemo(() => {
    if (!isReplaying || !replayAnnotations || replayAnnotations.length === 0) {
      return [];
    }
    
    const videoTimeMs = currentTime * 1000;
    return replayAnnotations.filter(annotation => {
      if (!annotation || !annotation.points || annotation.points.length < 2) {
        return false;
      }
      if ((annotation as any).globalTimeOffset !== undefined) {
        const globalTimeOffset = (annotation as any).globalTimeOffset;
        if (globalTimeOffset <= lastClearTime) {
          return false;
        }
        const isVisible = globalTimeOffset <= globalTimePosition;
        return isVisible;
      }
      if ((annotation as any).timeOffset !== undefined) {
        const timeOffset = (annotation as any).timeOffset;
        if (timeOffset <= lastClearTime) {
          return false;
        }
        const isVisible = timeOffset <= globalTimePosition;
        return isVisible;
      }
      if (annotation.videoTime !== undefined) {
        return annotation.videoTime <= videoTimeMs;
      }
      return annotation.timestamp <= videoTimeMs;
    });
  }, [isReplaying, replayAnnotations, currentTime, lastClearTime, globalTimePosition]);

  useEffect(() => {
    if (!isReplaying) return;
    const ctx = getContext();
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, width, height);
    
    if (visibleAnnotations.length > 0) {
      visibleAnnotations.forEach(path => {
        if (!path.tool) {
          path.tool = 'freehand';
        }
        drawPath(ctx, path);
      });
    }
  }, [isReplaying, replayAnnotations, currentTime, width, height, globalTimePosition, lastClearTime, getContext, drawPath]);
  useEffect(() => {
    if (isReplaying) return;
    const ctx = getContext();
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    allDrawings.forEach(path => {
      drawPath(ctx, path);
    });
  }, [allDrawings, isReplaying, width, height]);
  const handleManualAnnotation = useCallback((path: DrawingPath) => {
    const completePath = {
      ...path,
      tool: path.tool || 'freehand'
    };
    setAllDrawings(prev => [...prev, completePath]);
    if (isRecording && onAnnotationAdded) {
      onAnnotationAdded(completePath);
    }
  }, [isRecording, onAnnotationAdded]);
  const getPointerPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, [canvasRef]);
  const drawTemporaryLine = useCallback((start: Point, end: Point) => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    allDrawings.forEach(path => {
      drawPath(ctx, path);
    });
    ctx.beginPath();
    ctx.strokeStyle = toolColor;
    ctx.lineWidth = toolWidth;
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }, [getContext, width, height, allDrawings, toolColor, toolWidth, drawPath]);
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isReplaying) return;
    setIsDrawing(true);
    setCurrentPath([]);
    const position = getPointerPosition(e);
    if (!position) return;
    if (toolType === 'line') {
      setStartPoint(position);
      setCurrentPath([position]);
    } else {
      setCurrentPath([position]);
    }
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isReplaying) return;
    if ('touches' in e) {
      e.preventDefault();
    }
    const position = getPointerPosition(e);
    if (!position) return;
    if (toolType === 'line' && startPoint) {
      drawTemporaryLine(startPoint, position);
      setCurrentPath([startPoint, position]);
    } else {
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
    if (!isDrawing || isReplaying) return;
    setIsDrawing(false);
    if (toolType === 'line' && startPoint) {
      if (currentPath.length === 2) {
        const endPosition = currentPath[1];
        if (endPosition.x !== startPoint.x || endPosition.y !== startPoint.y) {
          const newPath: DrawingPath = {
            points: [startPoint, endPosition],
            color: toolColor,
            width: toolWidth,
            timestamp: Date.now(),
            tool: 'line'
          };
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
          if (isRecording && onAnnotationAdded) {
            onAnnotationAdded(newPath);
          }
            }
      }
      setStartPoint(null);
    } else if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        points: [...currentPath],
        color: toolColor,
        width: toolWidth,
        timestamp: Date.now(),
        tool: 'freehand'
      };
      setAllDrawings(prev => [...prev, newPath]);
      if (isRecording && onAnnotationAdded) {
        onAnnotationAdded(newPath);
      }
    }
    setCurrentPath([]);
  };
  useImperativeHandle(ref, () => ({
    canvasRef,
    allDrawings,
    getContext: () => getContext(),
    clearCanvasDrawings: () => {
      clearCanvasDrawings();
    },
    resetCanvas: () => {
      requestAnimationFrame(() => {
        const ctx = getContext();
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
        }
        setAllDrawings([]);
        setCurrentPath([]);
        setIsDrawing(false);
        requestAnimationFrame(() => {
          const ctx = getContext();
          if (ctx) {
            ctx.clearRect(0, 0, width, height);
          }
        });
      });
    },
    handleManualAnnotation: (path: DrawingPath) => {
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
export default React.memo(AnnotationCanvas);