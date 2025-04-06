'use client';

import Link from "next/link";
import VideoPlayerWrapper from "../src/components/VideoPlayerWrapper";
import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from 'next/navigation';

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
  
  // Get cartoon ID from URL if present
  const searchParams = useSearchParams();
  const cartoonId = searchParams.get('cartoonId');
  
  // State for selected cartoon
  const [contentToReview, setContentToReview] = useState<ReviewContent>({
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    videoTitle: "Big Buck Bunny",
    videoDescription: "A short animated film featuring a big rabbit dealing with three bullying rodents",
    dataLabelingTitle: "Animation Categories",
    labelProperties: [
      { id: "artisticStyle", label: "Artistic Style" },
      { id: "characterDesign", label: "Character Design" },
      { id: "motionDynamics", label: "Motion Dynamics" },
      { id: "colorPalette", label: "Color Palette" },
      { id: "narrativeTechniques", label: "Narrative Techniques" },
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
  });
  
  // Load cartoon data if cartoonId is provided
  useEffect(() => {
    if (!cartoonId) return;
    
    const loadCartoonData = async () => {
      try {
        const response = await fetch('/cartoons.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch cartoons: ${response.status}`);
        }
        
        const cartoons = await response.json();
        const selectedCartoon = cartoons.find((c) => c.id === cartoonId);
        
        if (selectedCartoon) {
          // Convert cartoon data to ReviewContent format
          const metricsArray = Object.entries(selectedCartoon.metrics).map(([name, value]) => ({ name, value }));
          
          setContentToReview({
            videoUrl: selectedCartoon.videoUrl,
            videoTitle: selectedCartoon.title,
            videoDescription: selectedCartoon.description,
            dataLabelingTitle: "Animation Categories",
            labelProperties: [
              { id: "artisticStyle", label: "Artistic Style" },
              { id: "characterDesign", label: "Character Design" },
              { id: "motionDynamics", label: "Motion Dynamics" },
              { id: "colorPalette", label: "Color Palette" },
              { id: "narrativeTechniques", label: "Narrative Techniques" },
            ],
            keyMetricsTitle: "Production Metrics",
            keyMetrics: metricsArray
          });
        }
      } catch (error) {
        console.error("Error loading cartoon:", error);
      }
    };
    
    loadCartoonData();
  }, [cartoonId]);
  
  // Generate initial categories state from labelProperties
  const initialCategories = contentToReview.labelProperties.reduce((acc, prop) => {
    acc[prop.id] = null; // null means no rating
    return acc;
  }, {} as Record<string, number | null>);
  
  // State for star ratings during recording
  const [categories, setCategories] = useState(initialCategories);
  
  // State to track if we're in replay mode
  const [isReplayMode, setIsReplayMode] = useState(false);
  
  // State to track active recording
  const [isRecording, setIsRecording] = useState(false);
  
  // State for category list with ratings that will be shown during replay
  const [categoryList, setCategoryList] = useState<{name: string, rating: number}[]>([]);
  
  // Define window type with our custom properties
  declare global {
    interface Window {
      __videoPlayerWrapper?: {
        recordCategoryChange: (category: string, rating: number) => void;
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
  
  const handleCategoryChange = (category: string, rating: number) => {
    console.log(`RECORDING: Changing category ${category} to rating ${rating}`);
    
    const newCategories = {
      ...categories,
      [category]: rating,
    };
    
    console.log('RECORDING: New categories state:', newCategories);
    setCategories(newCategories);
    
    // Record the category change event in the orchestrator if we're recording
    if (typeof window !== 'undefined' && window.__videoPlayerWrapper?.isRecording) {
      console.log(`RECORDING: Sending category event to orchestrator: ${category}=${rating}`);
      
      try {
        window.__videoPlayerWrapper.recordCategoryChange(category, rating);
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
    // Reset all categories to null (no rating)
    const resetCategories = Object.keys(categories).reduce((acc, key) => {
      acc[key] = null;
      return acc;
    }, {} as Record<string, number | null>);
    
    setCategories(resetCategories);
    
    // Also clear the category list for replay mode
    setCategoryList([]);
  }, [categories]);
  
  // Function to handle categories during replay
  const handleCategoryAddedDuringReplay = useCallback((categoryChanges: Record<string, number>) => {
    console.log('PARENT: Received categories for replay:', categoryChanges);
    
    // Debug log all entries
    Object.entries(categoryChanges).forEach(([key, value]) => {
      console.log(`PARENT: Category ${key} = ${value}`);
    });
    
    // Convert all rated categories to formatted objects with name and rating
    const ratedCategories = Object.entries(categoryChanges)
      .filter(([_, rating]) => rating !== null && rating > 0)
      .map(([categoryName, rating]) => {
        const label = getCategoryLabel(categoryName);
        console.log(`PARENT: Formatting category ${categoryName} to ${label} with rating ${rating}`);
        return {
          name: label,
          rating: rating as number
        };
      });
    
    if (ratedCategories.length > 0) {
      console.log(`PARENT: Adding ${ratedCategories.length} categories to replay list:`, ratedCategories);
      
      // Force state update with a deep copy and force render with a callback
      const newList = [...ratedCategories];
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
      console.log('PARENT: No rated categories found');
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
    <div className="min-h-screen p-4">
      <main className="max-w-4xl mx-auto">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold">Cartoon Annotation Tool</h1>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Link href="/inbox" className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md">
              Review Inbox
            </Link>
            <div className="flex space-x-2">
              <button
                onClick={() => document.getElementById(isClient && isRecording ? 'stopButton' : 'startRecordingButton')?.click()}
                disabled={isReplayMode}
                className={isReplayMode ? "bg-gray-300 text-gray-500 py-2 px-4 rounded-md" : isClient && isRecording ? "bg-gray-700 text-white py-2 px-4 rounded-md" : "bg-red-500 text-white py-2 px-4 rounded-md"}
              >
                {isClient && isRecording ? "Stop" : "Record"}
              </button>
              
              <button
                onClick={() => document.getElementById(isReplayMode ? 'stopButton' : 'startReplayButton')?.click()}
                disabled={isClient && (isRecording || (!hasRecordedSession && !isReplayMode))}
                className={isClient && (isRecording || (!hasRecordedSession && !isReplayMode)) ? "bg-gray-300 text-gray-500 py-2 px-4 rounded-md" : isReplayMode ? "bg-yellow-500 text-white py-2 px-4 rounded-md" : "bg-green-600 text-white py-2 px-4 rounded-md"}
              >
                {isReplayMode ? "Stop Replay" : "Replay Session"}
              </button>
              
              <button
                onClick={() => document.getElementById('downloadDataButton')?.click()}
                disabled={isClient && (isRecording || !hasRecordedSession)}
                className={isClient && (isRecording || !hasRecordedSession) ? "bg-gray-300 text-gray-500 py-2 px-4 rounded-md" : "bg-blue-500 text-white py-2 px-4 rounded-md"}
              >
                Download Data
              </button>
              
              <label className="bg-purple-500 text-white py-2 px-4 rounded-md cursor-pointer inline-block">
                Load Data
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={(e) => {
                    const fileInput = document.getElementById('fileUploadInput') as HTMLInputElement;
                    if (fileInput && e.target.files && e.target.files.length > 0) {
                      const dataTransfer = new DataTransfer();
                      dataTransfer.items.add(e.target.files[0]);
                      fileInput.files = dataTransfer.files;
                      const event = new Event('change', { bubbles: true });
                      fileInput.dispatchEvent(event);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
        
        {/* Display cartoon title and description from URL parameter */}
        {cartoonId && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-semibold">{contentToReview.videoTitle}</h2>
            <p className="text-gray-600">{contentToReview.videoDescription}</p>
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Categories Section */}
          <div className="lg:w-1/4">
            <div className="p-4 border rounded-lg bg-gray-50 h-full">
              <h2 className="text-xl font-semibold mb-3">{contentToReview.dataLabelingTitle}</h2>
              
              {/* Show rating stars during recording mode */}
              {!isReplayMode ? (
                <div className="space-y-3">
                  {contentToReview.labelProperties.map((property) => (
                    <div key={property.id}>
                      <div className="mb-1">{property.label}</div>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleCategoryChange(property.id, star)}
                            className={categories[property.id] >= star ? "text-xl px-1 text-yellow-400" : "text-xl px-1 text-gray-300"}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Show ratings during replay mode
                <div>
                  {categoryList.length === 0 ? (
                    <p className="text-gray-500 italic">Category ratings will appear here when session loads.</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-2">Animation category ratings:</p>
                      <ul className="space-y-3">
                        {categoryList.map((category, index) => (
                          <li key={index}>
                            <div className="font-medium">{category.name}</div>
                            <div className="flex text-yellow-400 mt-1 text-base">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className={star <= category.rating ? "text-yellow-400" : "text-gray-300"}>
                                  ★
                                </span>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500 mt-2">{categoryList.length} categories rated</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Video Player */}
          <div className="lg:w-1/2">
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
          
          {/* Key Metrics Section */}
          {contentToReview.keyMetrics && contentToReview.keyMetrics.length > 0 && (
            <div className="lg:w-1/4">
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