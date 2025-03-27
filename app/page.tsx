"use client"

import Image from "next/image";
import VideoPlayerWrapper from "../src/components/VideoPlayerWrapper";
import { useState, useCallback, useEffect } from "react";

export default function Home() {
  // Interface for review content configuration
  interface DataLabelingProperty {
    id: string;
    label: string;
  }
  
  interface KeyMetric {
    name: string;
    value: string | number;
  }

  interface ReviewContent {
    videoUrl: string;
    videoTitle?: string;
    videoDescription?: string;
    dataLabelingTitle: string;
    labelProperties: DataLabelingProperty[];
    keyMetricsTitle?: string;
    keyMetrics?: KeyMetric[];
  }
  
  // Example content to be reviewed
  const contentToReview: ReviewContent = {
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    videoTitle: "Big Buck Bunny",
    videoDescription: "A short animated film featuring a big rabbit dealing with three bullying rodents",
    dataLabelingTitle: "Animation Categories",
    labelProperties: [
      { id: "artisticStyle", label: "Artistic Style" },
      { id: "characterDesign", label: "Character Design" },
      { id: "backgroundSettings", label: "Background Settings" },
      { id: "motionDynamics", label: "Motion Dynamics" },
      { id: "colorPalette", label: "Color Palette" },
      { id: "soundEffects", label: "Sound Effects" },
      { id: "visualEffects", label: "Visual Effects" },
      { id: "narrativeTechniques", label: "Narrative Techniques" },
      { id: "perspectiveView", label: "Perspective View" },
      { id: "lightingShadows", label: "Lighting & Shadows" },
    ],
    keyMetricsTitle: "Production Metrics",
    keyMetrics: [
      { name: "Runtime", value: "10:34" },
      { name: "Release Year", value: 2008 },
      { name: "Production Budget", value: "$150,000" },
      { name: "Character Count", value: 4 },
      { name: "Animation Team Size", value: 12 },
      { name: "Frames Rendered", value: "15,240" },
      { name: "Software Used", value: "Blender" },
      { name: "Render Time (hours)", value: 687 }
    ]
  };
  
  // Generate initial categories state from labelProperties
  const initialCategories = contentToReview.labelProperties.reduce((acc, prop) => {
    acc[prop.id] = false;
    return acc;
  }, {} as Record<string, boolean>);
  
  // State for checkboxes during recording
  const [categories, setCategories] = useState(initialCategories);
  
  // State to track if we're in replay mode
  const [isReplayMode, setIsReplayMode] = useState(false);
  
  // State to track active recording
  const [isRecording, setIsRecording] = useState(false);
  
  // State for category list that will be shown during replay
  const [categoryList, setCategoryList] = useState<string[]>([]);
  
  // Define window type with our custom properties
  declare global {
    interface Window {
      __videoPlayerWrapper?: {
        recordCategoryChange: (category: string, checked: boolean) => void;
        isRecording: boolean;
      };
      __hasRecordedSession?: boolean;
    }
  }
  
  // State to track if we have a recorded session available
  const [hasRecordedSession, setHasRecordedSession] = useState(false);
  
  // Get formatted category label
  const getCategoryLabel = (category: string) => {
    return category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
  };
  
  const handleCategoryChange = (category: string) => {
    const newValue = !categories[category as keyof typeof categories];
    console.log(`RECORDING: Changing category ${category} to ${newValue}`);
    
    const newCategories = {
      ...categories,
      [category]: newValue,
    };
    
    console.log('RECORDING: New categories state:', newCategories);
    setCategories(newCategories);
    
    // Record the category change event in the orchestrator if we're recording
    if (typeof window !== 'undefined' && window.__videoPlayerWrapper?.isRecording) {
      console.log(`RECORDING: Sending category event to orchestrator: ${category}=${newValue}`);
      
      try {
        window.__videoPlayerWrapper.recordCategoryChange(category, newValue);
        console.log('RECORDING: Category event sent successfully');
      } catch (error) {
        console.error('RECORDING: Error sending category event:', error);
      }
    } else {
      console.warn('RECORDING: Not recording category event - isRecording is false or wrapper not available');
      console.log('RECORDING: window.__videoPlayerWrapper?.isRecording =', 
        typeof window !== 'undefined' ? window.__videoPlayerWrapper?.isRecording : 'window undefined');
    }
  };
  
  // Function to clear all categories (called when recording stops)
  const clearCategories = useCallback(() => {
    // Reset all categories to false
    const resetCategories = Object.keys(categories).reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as Record<string, boolean>);
    
    setCategories(resetCategories);
    
    // Also clear the category list for replay mode
    setCategoryList([]);
  }, []);
  
  // Function to handle categories during replay
  const handleCategoryAddedDuringReplay = useCallback((categoryChanges: Record<string, boolean>) => {
    console.log('PARENT: Received categories for replay:', categoryChanges);
    
    // Debug log all entries
    Object.entries(categoryChanges).forEach(([key, value]) => {
      console.log(`PARENT: Category ${key} = ${value}`);
    });
    
    // Convert all checked categories to formatted labels
    const checkedCategories = Object.entries(categoryChanges)
      .filter(([_, isChecked]) => isChecked)
      .map(([categoryName, _]) => {
        const label = getCategoryLabel(categoryName);
        console.log(`PARENT: Formatting category ${categoryName} to ${label}`);
        return label;
      });
    
    if (checkedCategories.length > 0) {
      console.log(`PARENT: Adding ${checkedCategories.length} categories to replay list:`, checkedCategories);
      
      // Force state update with a deep copy and force render with a callback
      const newList = [...checkedCategories];
      console.log('PARENT: Setting category list to:', newList);
      
      // Ensure we're in replay mode
      setIsReplayMode(true);
      
      // Replace the entire list at once with a forced update
      setCategoryList(newList);
      
      // Force UI update by using double setState in different ticks for React 18+ batching
      setTimeout(() => {
        setCategoryList(prevList => {
          console.log('PARENT: Forced update, category list is now:', prevList);
          return prevList; // Return same array but force an update
        });
        
        // Double-check in the next tick
        setTimeout(() => {
          console.log('PARENT: After update, category list should be:', newList);
        }, 100);
      }, 50);
    } else {
      console.log('PARENT: No checked categories found');
      setCategoryList([]);
    }
  }, []);
  
  // Function to handle replay mode change
  const handleReplayModeChange = useCallback((isReplay: boolean) => {
    console.log(`Setting replay mode to: ${isReplay}`);
    setIsReplayMode(isReplay);
    
    // Clear the category list when entering/exiting replay mode
    if (isReplay) {
      setCategoryList([]);
    }
  }, []);
  
  // Function to update recording state (attached to global window object for access)
  useEffect(() => {
    // Check window object for recording state and session availability
    const checkState = () => {
      if (typeof window !== 'undefined') {
        // Check recording state
        if (window.__videoPlayerWrapper) {
          setIsRecording(!!window.__videoPlayerWrapper.isRecording);
        }
        
        // Check session availability
        const hasSession = !!window.__hasRecordedSession;
        if (hasSession !== hasRecordedSession) {
          console.log(`Session availability changed: ${hasSession}`);
          setHasRecordedSession(hasSession);
        }
      }
    };
    
    // Initial check
    checkState();
    
    // Set up interval to periodically check state
    const interval = setInterval(checkState, 300);
    
    // Listen for a custom event that might be triggered when session is available
    const handleSessionChange = () => {
      console.log('Received session change event');
      checkState();
    };
    
    window.addEventListener('session-available', handleSessionChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('session-available', handleSessionChange);
    };
  }, [hasRecordedSession]);
  
  // Force client-side rendering for window access
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-4 pb-8 gap-4 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-4 w-full max-w-4xl items-center">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
          <h1 className="text-2xl font-bold">Cartoon Annotation Tool</h1>
          <div className="action-buttons flex space-x-2">
            {/* Record Button - Always visible but disabled during replay */}
            <button
              onClick={() => document.getElementById(isClient && isRecording ? 'stopButton' : 'startRecordingButton')?.click()}
              disabled={isReplayMode}
              className={`flex items-center justify-center gap-1 w-36 py-2 px-4 rounded-md transition-colors whitespace-nowrap ${
                isReplayMode
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isClient && isRecording 
                    ? 'bg-gray-700 hover:bg-gray-800 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isClient && isRecording ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                  </svg>
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-white"></span>
                  <span>Record</span>
                </>
              )}
            </button>
            
            {/* Replay Button - Toggles between Start/Stop Replay */}
            <button
              onClick={() => document.getElementById(isReplayMode ? 'stopButton' : 'startReplayButton')?.click()}
              disabled={isClient && (isRecording || (!hasRecordedSession && !isReplayMode))}
              className={`flex items-center gap-1 py-2 px-4 rounded-md transition-colors ${
                isClient && (isRecording || (!hasRecordedSession && !isReplayMode))
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isReplayMode
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isReplayMode ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                  </svg>
                  <span>Stop Replay</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286l-11.54 6.347c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                  </svg>
                  <span>Replay Session</span>
                </>
              )}
            </button>
            
            {/* Download Button - Always visible */}
            <button
              onClick={() => document.getElementById('downloadDataButton')?.click()}
              disabled={isClient && (isRecording || !hasRecordedSession)}
              className={`py-2 px-4 rounded-md transition-colors ${
                isClient && (isRecording || !hasRecordedSession)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Download Data
            </button>
            
            {/* Load Data Button - Always visible */}
            <label className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md transition-colors cursor-pointer">
              Load Data
              <input 
                type="file" 
                accept=".json" 
                onChange={(e) => {
                  const fileInput = document.getElementById('fileUploadInput') as HTMLInputElement;
                  if (fileInput && e.target.files && e.target.files.length > 0) {
                    // Create a new DataTransfer object and add the file
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(e.target.files[0]);
                    
                    // Set the files property to the new DataTransfer's files
                    fileInput.files = dataTransfer.files;
                    
                    // Trigger the change event
                    const event = new Event('change', { bubbles: true });
                    fileInput.dispatchEvent(event);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row w-full gap-4">
          {/* Categories Section - 1/4 */}
          <div className="w-full lg:w-1/4">
            <div className="p-4 border rounded-lg bg-gray-50 h-full">
              <h2 className="text-xl font-semibold mb-3">{contentToReview.dataLabelingTitle}</h2>
              
              {/* Show checkboxes during recording mode */}
              {!isReplayMode ? (
                <div className="space-y-2">
                  {contentToReview.labelProperties.map((property) => (
                    <div key={property.id} className="flex items-center">
                      <input 
                        type="checkbox" 
                        id={property.id} 
                        checked={categories[property.id] || false}
                        onChange={() => handleCategoryChange(property.id)}
                        className="h-4 w-4 mr-2"
                      />
                      <label htmlFor={property.id}>{property.label}</label>
                    </div>
                  ))}
                </div>
              ) : (
                // Show a simple list during replay mode
                <div className="replay-categories">
                  {categoryList.length === 0 ? (
                    <p className="text-gray-500 italic">Categories will appear here when session loads.</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-2">Selected animation categories:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {categoryList.map((category, index) => (
                          <li key={index} className="text-green-600 font-medium">
                            {category}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500 mt-2">{categoryList.length} categories selected</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Video Player - 1/2 */}
          <div className="w-full lg:w-1/2">
            <VideoPlayerWrapper 
              categories={categories}
              onCategoriesCleared={clearCategories}
              onCategoriesLoaded={handleCategoryAddedDuringReplay}
              onReplayModeChange={handleReplayModeChange}
              videoUrl={contentToReview.videoUrl}
              videoId={contentToReview.videoTitle?.replace(/\s+/g, '-').toLowerCase()}
              contentToReview={contentToReview}
            />
          </div>
          
          {/* Key Metrics Section - 1/4 */}
          {contentToReview.keyMetrics && contentToReview.keyMetrics.length > 0 && (
            <div className="w-full lg:w-1/4">
              <div className="p-4 border rounded-lg bg-gray-50 h-full">
                <h2 className="text-xl font-semibold mb-3">{contentToReview.keyMetricsTitle || "Key Metrics"}</h2>
                <div className="flex flex-col gap-3">
                  {contentToReview.keyMetrics.map((metric, index) => (
                    <div key={index} className="p-2 bg-white rounded shadow-sm">
                      <span className="block text-xs text-gray-500">{metric.name}</span>
                      <span className="text-lg font-semibold">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
