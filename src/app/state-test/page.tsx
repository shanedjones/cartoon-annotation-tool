'use client';

import { useState, useEffect } from 'react';
import { useAuth, useAuthActions } from '@/state/auth/hooks';
import { useTimeline, useTimelineActions } from '@/state/timeline/hooks';
import { useSession, useSessionActions } from '@/state/session/hooks';
import { useAnnotation, useAnnotationActions } from '@/state/annotation/hooks';
import { useVideo, useMediaActions } from '@/state/media/hooks';

/**
 * Simple component to test and demonstrate the new state management system
 */
export default function StateTestPage() {
  // Access all domains of state
  const auth = useAuth();
  const authActions = useAuthActions();
  
  const timeline = useTimeline();
  const timelineActions = useTimelineActions();
  
  const session = useSession();
  const sessionActions = useSessionActions();
  
  const annotation = useAnnotation();
  const annotationActions = useAnnotationActions();
  
  const video = useVideo();
  const mediaActions = useMediaActions();
  
  // State for test video URL
  const [videoUrl, setVideoUrl] = useState('https://example.com/test-video.mp4');
  
  // Set up test actions
  const testTimelineActions = () => {
    timelineActions.setPosition(30);
    setTimeout(() => timelineActions.addEvent({
      id: 'test-event',
      time: 30,
      type: 'test',
    }), 500);
  };
  
  const testVideoActions = () => {
    mediaActions.setVideoUrl(videoUrl);
  };
  
  // Test window globals
  const checkWindowGlobals = () => {
    const globals = {
      globalTimePosition: window.__globalTimePosition,
      hasRecordedSession: window.__hasRecordedSession,
      isCompletedVideo: window.__isCompletedVideo,
      sessionReady: window.__sessionReady,
      isReplaying: window.__isReplaying,
      lastClearTime: window.__lastClearTime,
      videoPlayerWrapper: window.__videoPlayerWrapper ? 'defined' : 'undefined'
    };
    
    alert(JSON.stringify(globals, null, 2));
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">State Management System Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth State */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Auth State</h2>
          <div className="mb-3">
            <p><strong>Status:</strong> {auth.status}</p>
            <p><strong>User:</strong> {auth.user ? auth.user.email : 'Not logged in'}</p>
          </div>
        </div>
        
        {/* Timeline State */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Timeline State</h2>
          <div className="mb-3">
            <p><strong>Position:</strong> {timeline.position}ms</p>
            <p><strong>Events:</strong> {timeline.events.length}</p>
            <p><strong>Is Recording:</strong> {timeline.isRecording ? 'Yes' : 'No'}</p>
          </div>
          <button 
            onClick={testTimelineActions}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Timeline Actions
          </button>
        </div>
        
        {/* Session State */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Session State</h2>
          <div className="mb-3">
            <p><strong>Status:</strong> {session.status}</p>
            <p><strong>Is Recording:</strong> {session.isRecording ? 'Yes' : 'No'}</p>
            <p><strong>Is Replaying:</strong> {session.isReplaying ? 'Yes' : 'No'}</p>
            <p><strong>Categories:</strong> {session.categories.length}</p>
          </div>
          <button 
            onClick={() => sessionActions.startRecording('test-video')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
          >
            Start Recording
          </button>
          <button 
            onClick={() => sessionActions.stopRecording(Date.now())}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Stop Recording
          </button>
        </div>
        
        {/* Annotation State */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Annotation State</h2>
          <div className="mb-3">
            <p><strong>Current Tool:</strong> {annotation.currentTool}</p>
            <p><strong>Color:</strong> {annotation.color}</p>
            <p><strong>Stroke Width:</strong> {annotation.strokeWidth}</p>
            <p><strong>Is Visible:</strong> {annotation.isVisible ? 'Yes' : 'No'}</p>
          </div>
          <button 
            onClick={() => annotationActions.toggleVisibility()}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Toggle Visibility
          </button>
        </div>
        
        {/* Video State */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Video State</h2>
          <div className="mb-3">
            <p><strong>Is Playing:</strong> {video.isPlaying ? 'Yes' : 'No'}</p>
            <p><strong>Current Src:</strong> {video.currentSrc || 'None'}</p>
            <p><strong>Status:</strong> {video.status}</p>
          </div>
          <div className="flex items-center mb-3">
            <input 
              type="text" 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)}
              className="border rounded px-2 py-1 flex-grow mr-2"
            />
            <button 
              onClick={testVideoActions}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
              Set URL
            </button>
          </div>
          <div className="flex">
            <button 
              onClick={() => mediaActions.play()}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
            >
              Play
            </button>
            <button 
              onClick={() => mediaActions.pause()}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Pause
            </button>
          </div>
        </div>
        
        {/* Window Globals Test */}
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Window Globals</h2>
          <div className="mb-3">
            <p>Test the compatibility layer with window globals.</p>
          </div>
          <button 
            onClick={checkWindowGlobals}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Check Window Globals
          </button>
        </div>
      </div>
    </div>
  );
}