'use client';

import { useState } from 'react';
import { 
  useAuth, 
  useSession, 
  useMedia, 
  useTimeline, 
  useAnnotation,
  useTimelineActions,
  useAnnotationActions,
  useMediaActions,
  useSessionActions
} from '@/state';

/**
 * Test page to verify the new state management system
 */
export default function StateTestPage() {
  const auth = useAuth();
  const session = useSession();
  const media = useMedia();
  const timeline = useTimeline();
  const annotation = useAnnotation();
  
  const timelineActions = useTimelineActions();
  const annotationActions = useAnnotationActions();
  const mediaActions = useMediaActions();
  const sessionActions = useSessionActions();

  // Local state to track test results
  const [testResults, setTestResults] = useState<{
    name: string;
    success: boolean;
    message?: string;
  }[]>([]);

  // Function to run a test and record results
  const runTest = (name: string, testFn: () => boolean, message?: string) => {
    try {
      const success = testFn();
      setTestResults(prev => [...prev, { name, success, message }]);
    } catch (error) {
      setTestResults(prev => [...prev, { 
        name, 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }]);
    }
  };

  // Test timeline state
  const testTimelineState = () => {
    // Set a timeline position
    timelineActions.setPosition(5.5);
    return timeline.position === 5.5;
  };

  // Test annotation state
  const testAnnotationState = () => {
    // Clear annotations
    annotationActions.clearAnnotations();
    return annotation.paths.length === 0;
  };

  // Test running all tests
  const runAllTests = () => {
    setTestResults([]);
    runTest('Timeline State', testTimelineState);
    runTest('Annotation State', testAnnotationState);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">State Management Test Page</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Auth State</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs">
            {JSON.stringify(auth, null, 2)}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Session State</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Media State</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs">
            {JSON.stringify(media, null, 2)}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Timeline State</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs">
            {JSON.stringify(timeline, null, 2)}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Annotation State</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs">
            {JSON.stringify({
              ...annotation,
              paths: annotation.paths.length + ' items'
            }, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mb-4">
        <button
          onClick={runAllTests}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Run All Tests
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Test Results</h2>
        {testResults.length === 0 ? (
          <p className="text-gray-500">No tests run yet</p>
        ) : (
          <ul className="space-y-2">
            {testResults.map((result, index) => (
              <li 
                key={index}
                className={`p-2 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}
              >
                <span className="font-medium">{result.name}: </span>
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? 'Passed' : 'Failed'}
                </span>
                {result.message && (
                  <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}