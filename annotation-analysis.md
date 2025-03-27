Analysis of Drawing Playback Issues in Cartoon Annotation Tool
After examining your codebase, I've identified several issues causing drawings not to play and clear correctly during playback. Let's break down the problems and potential solutions.
Root Causes

Inconsistent Visibility State Management

Different behavior in record vs. replay modes
During recording: annotations are removed from allDrawings array
During replay: annotations are only marked as hidden but kept in array
This inconsistency creates problems when determining which annotations should be visible


Clear Event Timing Information Loss

Multiple timing properties (timestamp, videoTime, timeOffset, hiddenAt, clearVideoTime)
Inconsistent extraction and use of these properties during replay
Missing or incorrect timing can cause out-of-order execution


Complex State Management Across Components

Annotation state exists in multiple places:

AnnotationCanvas.allDrawings
window.__hiddenAnnotations
window.__clearEvents
FeedbackOrchestrator.eventsRef


These can get out of sync, especially during serialization/deserialization


Execution Timing Issues

Clear events and draw events need specific sequencing
Current time adjustments may not be sufficient to ensure proper order



Detailed Analysis of Key Issues
Issue 1: Clear Event Detection Problems
In AnnotationCanvas.tsx, the code attempts to identify clear events using various formats:
javascriptCopy// Multiple detection approaches
const isClearEvent = annotation.isClearEvent === true;
const clearDetails = (annotation as any).details?.clear === true;
const isExplicitClear = annotation.points?.length === 0 && annotation.hiddenAt;

// Multiple timestamp extraction approaches
if (annotation.clearVideoTime) {
  clearTime = annotation.clearVideoTime;
}
else if ((annotation as any).details?.clearVideoTime) {
  clearTime = (annotation as any).details.clearVideoTime;
}
// ...and several other fallbacks
This creates inconsistency in which clear events are detected and when they're executed.
Issue 2: State Reset Inconsistency
The clearCanvasDrawings function handles recording and replay modes differently:
javascriptCopyif (isReplaying) {
  // During replay, mark drawings as hidden but keep them in the array
  setAllDrawings(prevDrawings => 
    prevDrawings.map(drawing => ({
      ...drawing,
      visible: false,
      hiddenAt: currentVideoTime || now
    }))
  );
} else {
  // In recording mode, store hidden annotations globally then clear array
  window.__hiddenAnnotations = window.__hiddenAnnotations || [];
  window.__hiddenAnnotations.push(...hiddenDrawings);
  setAllDrawings([]);
}
This difference means annotations are tracked differently between modes.
Issue 3: Timing Problems in Orchestrator
In FeedbackOrchestrator.tsx, the timing adjustments for clear and draw events may not be sufficient:
javascriptCopy// For clear events
const adjustedClearTime = clearVideoTime - 10; // 10ms earlier

// For draw events
const adjustedTimeOffset = event.timeOffset + 5; // 5ms later
When events are grouped closely together, these small adjustments might not maintain proper ordering.
Recommended Solutions
1. Standardize Annotation Visibility State
javascriptCopy// In AnnotationCanvas.tsx - clearCanvasDrawings
// Updated function to standardize clear behavior
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
  }
  
  // Behavior now more consistent between modes
  if (isReplaying) {
    // In replay, update visibility state but keep annotations for history
    setAllDrawings(hiddenDrawings);
  } else {
    // In recording, still clear array for performance
    setAllDrawings([]);
  }
  
  return clearMark;
};
2. Improve Clear Event Handling in the Orchestrator
javascriptCopy// In FeedbackOrchestrator.tsx - executeEvent (annotation clear case)
case 'clear':
  try {
    const clearVideoTime = payload.clearVideoTime || 
      (videoElementRef.current ? videoElementRef.current.currentTime * 1000 : event.timeOffset);
    
    // Apply a more significant adjustment to ensure clear events happen first
    const adjustedClearTime = clearVideoTime - 50; // 50ms earlier instead of 10ms
    
    console.log(`Executing clear event at timeOffset: ${event.timeOffset}ms, ` +
      `videoTime: ${adjustedClearTime}ms (adjusted from ${clearVideoTime}ms)`);
    
    // Create more comprehensive clear event
    const clearEvent = {
      id: `clear-${event.id || Date.now()}`,
      points: [],
      color: 'transparent',
      width: 0,
      timestamp: Date.now(),
      videoTime: adjustedClearTime,
      timeOffset: event.timeOffset - 50,
      isClearEvent: true,
      visible: false,
      hiddenAt: adjustedClearTime
    };
    
    // First add to timeline for tracking
    drawAnnotation(clearEvent);
    
    // Then execute the clear with a small delay
    setTimeout(() => {
      clearAnnotations();
    }, 10);
  } catch (error) {
    console.error('Error during annotation clearing:', error);
  }
  break;
3. Enhance Event Processing in the Orchestrator
javascriptCopy// In FeedbackOrchestrator.tsx - processPendingEvents
const processPendingEvents = useCallback((currentTimeMs: number) => {
  if (pendingEventsRef.current.length === 0) return;
  
  const processingTime = currentTimeMs + 50; // 50ms lookahead
  
  const eventsToExecute = [];
  const remainingEvents = [];
  
  pendingEventsRef.current.forEach(event => {
    if (event.timeOffset <= processingTime) {
      eventsToExecute.push(event);
    } else {
      remainingEvents.push(event);
    }
  });
  
  // Update pending events immediately to prevent double processing
  pendingEventsRef.current = remainingEvents;
  
  if (eventsToExecute.length === 0) return;
  
  // Sort events by timeOffset
  eventsToExecute.sort((a, b) => a.timeOffset - b.timeOffset);
  
  // Split by type with clear events having highest priority
  const clearEvents = eventsToExecute.filter(e => 
    e.type === 'annotation' && e.payload.action === 'clear');
  
  const drawEvents = eventsToExecute.filter(e => 
    e.type === 'annotation' && e.payload.action === 'draw');
  
  const otherEvents = eventsToExecute.filter(e => 
    !(e.type === 'annotation' && (e.payload.action === 'clear' || e.payload.action === 'draw')));
  
  // Execute with significant delays between different event types
  
  // 1. Clear events first
  clearEvents.forEach((event, index) => {
    setTimeout(() => {
      if (executeEventRef.current) {
        executeEventRef.current(event);
      }
    }, index * 20); // 20ms between clear events
  });
  
  // 2. Draw events after all clears
  const clearDelay = clearEvents.length * 20 + 50; // 50ms buffer after last clear
  
  drawEvents.forEach((event, index) => {
    setTimeout(() => {
      if (executeEventRef.current) {
        executeEventRef.current(event);
      }
    }, clearDelay + index * 10); // 10ms between draw events
  });
  
  // 3. Other events last
  const totalDelay = clearDelay + drawEvents.length * 10 + 30;
  
  otherEvents.forEach(event => {
    setTimeout(() => {
      if (executeEventRef.current) {
        executeEventRef.current(event);
      }
    }, totalDelay);
  });
}, []);
4. Simplify Annotation Visibility Filtering
javascriptCopy// In AnnotationCanvas.tsx - useEffect for filtering and displaying annotations
// Replace the complex filtering logic with this clearer approach
const getVisibleAnnotations = (annotations, videoTimeMs, clearEvents) => {
  // Find most recent clear event
  const mostRecentClearTime = clearEvents.length > 0 
    ? Math.max(0, ...clearEvents.filter(time => time <= videoTimeMs)) 
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
    const annotationTime = annotation.videoTime || 
                         (annotation as any).timeOffset || 
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
Implementation Plan

Start with AnnotationCanvas.tsx:

Standardize the clearCanvasDrawings function first
Simplify the annotation filtering logic
Improve clear event detection


Then update FeedbackOrchestrator.tsx:

Enhance the processPendingEvents function
Improve timing in executeEvent for clear and draw events


Finally, update VideoPlayerWrapper.tsx:

Ensure consistent metadata in drawAnnotation and clearAnnotations
Improve session serialization and deserialization


Add improved debugging:

More comprehensive logging around clear events
Visualization of annotation lifecycle would be helpful



This systematic approach addresses the root causes while minimizing disruption to the existing architecture. The focus is on consistent state management and proper execution timing, which should fix the drawing playback and clearing issues.
Would you like me to provide more specific code changes for any particular component?