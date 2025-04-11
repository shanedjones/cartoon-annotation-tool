'use client';

import Link from "next/link";
import VideoPlayerWrapper from "../src/components/VideoPlayerWrapper";
import { useState, useCallback, useEffect, Suspense } from "react";
import type { FeedbackSession } from "@/src/components/FeedbackOrchestrator";
import { useSearchParams } from 'next/navigation';

// Wrapper component for functionality that requires search params
function HomeContent() {
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
  
  // Get video ID from URL if present
  const searchParams = useSearchParams();
  const videoId = searchParams.get('videoId');
  
  // State for selected video
  const [contentToReview, setContentToReview] = useState<ReviewContent | null>(null);
  
  // Load video data if videoId is provided
  useEffect(() => {
    if (!videoId) {
      // Initialize with empty content if no video is selected
      setContentToReview(null);
      return;
    }
    
    const loadVideoData = async () => {
      try {
        // Fetch specific video by ID from Cosmos DB via API
        const response = await fetch(`/api/videos?id=${videoId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status}`);
        }
        
        const videos = await response.json();
        
        // API returns an array even when querying by ID
        if (videos && videos.length > 0) {
          const selectedVideo = videos[0];
          
          // Convert video data to ReviewContent format
          const metricsArray = Object.entries(selectedVideo.metrics).map(([name, value]) => ({ 
            name, 
            value: typeof value === 'string' || typeof value === 'number' ? value : String(value) 
          }));
          
          setContentToReview({
            videoUrl: selectedVideo.videoUrl,
            videoTitle: selectedVideo.title,
            videoDescription: selectedVideo.description,
            dataLabelingTitle: selectedVideo.dataLabelingTitle || "Animation Categories",
            labelProperties: selectedVideo.labelProperties || [
              { id: "artisticStyle", label: "Artistic Style" },
              { id: "characterDesign", label: "Character Design" },
              { id: "motionDynamics", label: "Motion Dynamics" },
              { id: "colorPalette", label: "Color Palette" },
              { id: "narrativeTechniques", label: "Narrative Techniques" },
            ],
            keyMetricsTitle: selectedVideo.keyMetricsTitle || "Swing Metrics",
            keyMetrics: metricsArray
          });
          
          // Check if this video has a saved review session
          if (selectedVideo.reviewSession) {
            console.log("Found saved review session:", selectedVideo.reviewSession);
            setSavedReviewSession(selectedVideo.reviewSession);
            
            // If status is "Completed", make session available for replay but don't auto-start
            if (selectedVideo.status === "Completed") {
              console.log("Completed review found, making session available for replay");
              // Use type assertion to add custom properties to window
              (window as any).__hasRecordedSession = true;
              (window as any).__isCompletedVideo = true; // Mark as already completed
              const event = new CustomEvent('session-available');
              window.dispatchEvent(event);
            }
          }
        }
      } catch (error) {
        console.error("Error loading video:", error);
      }
    };
    
    loadVideoData();
  }, [videoId]);
  
  // State for star ratings during recording
  const [categories, setCategories] = useState<Record<string, number | null>>({});
  
  // State to track if we're in replay mode
  const [isReplayMode, setIsReplayMode] = useState(false);
  
  // State to track active recording
  const [isRecording, setIsRecording] = useState(false);
  
  // State for category list with ratings that will be shown during replay
  const [categoryList, setCategoryList] = useState<{id?: string, name: string, rating: number}[]>([]);
  
  // Use type assertions instead of global declarations
  
  // State tracking
  const [hasRecordedSession, setHasRecordedSession] = useState(false);
  const [isCompletedVideo, setIsCompletedVideo] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  
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
    if (typeof window !== 'undefined') {
      console.log(`RECORDING: Sending category event to orchestrator: ${category}=${rating}`);
      
      try {
        // Always send to record category changes, regardless of recording state
        // This ensures categories are saved properly even when not actively recording
        if (window.__videoPlayerWrapper?.recordCategoryChange) {
          window.__videoPlayerWrapper.recordCategoryChange(category, rating);
          console.log('RECORDING: Category event sent successfully');
        } else {
          console.warn('RECORDING: recordCategoryChange function not available');
        }
      } catch (error) {
        console.error('RECORDING: Error sending category event:', error);
      }
    } else {
      console.warn('RECORDING: Window not defined, cannot send category event');
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
          id: categoryName, // Keep the original ID
          name: label,
          rating: rating as number
        };
      });
    
    if (ratedCategories.length > 0) {
      console.log(`PARENT: Adding ${ratedCategories.length} categories to replay list:`, ratedCategories);
      
      // Force state update with a deep copy and force render with a callback
      const newList = [...ratedCategories];
      console.log('PARENT: Setting category list to:', newList);
      
      // Replace the entire list at once with a forced update - don't set replay mode here
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
    
    // Ensure the UI knows session is being replayed when mode changes
    if (isReplay && typeof window !== 'undefined') {
      // Update window state when entering replay mode
      window.__isReplaying = true;
    } else if (typeof window !== 'undefined') {
      window.__isReplaying = false;
    }
    
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
        
        // Check if this is a completed video
        const isCompleted = !!window.__isCompletedVideo;
        if (isCompleted !== isCompletedVideo) {
          console.log(`Completed video status changed: ${isCompleted}`);
          setIsCompletedVideo(isCompleted);
        }
        
        // Check if session is ready for replay
        const sessionReady = !!window.__sessionReady;
        if (sessionReady !== isSessionReady) {
          console.log(`Session ready status changed: ${sessionReady}`);
          setIsSessionReady(sessionReady);
        }
        
        // Check if session is actively being replayed
        const isReplayActive = !!window.__isReplaying;
        if (isReplayActive !== isReplayMode) {
          console.log(`Replay active status changed: ${isReplayActive}`);
          setIsReplayMode(isReplayActive);
        }
      }
    };
    
    // Initial check
    checkState();
    
    // Set up interval to periodically check state
    const interval = setInterval(checkState, 300);
    
    // Listen for session availability events
    const handleSessionChange = () => {
      console.log('Received session change event');
      checkState();
    };
    
    const handleSessionReady = () => {
      console.log('Received session ready event');
      checkState();
    };
    
    window.addEventListener('session-available', handleSessionChange);
    window.addEventListener('session-ready', handleSessionReady);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('session-available', handleSessionChange);
      window.removeEventListener('session-ready', handleSessionReady);
    };
  }, [hasRecordedSession, isCompletedVideo, isSessionReady]);
  
  // Force client-side rendering for window access
  const [isClient, setIsClient] = useState(false);
  const [savedReviewSession, setSavedReviewSession] = useState(null);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Generate initial categories state from labelProperties when content is loaded
  useEffect(() => {
    if (contentToReview?.labelProperties) {
      const initialCats = contentToReview.labelProperties.reduce((acc, prop) => {
        acc[prop.id] = null; // null means no rating
        return acc;
      }, {} as Record<string, number | null>);
      setCategories(initialCats);
    }
  }, [contentToReview]);
  
  // Save the review session to Cosmos DB when a recording is completed
  const onSessionComplete = useCallback(async (session: FeedbackSession) => {
    console.log('Session complete:', session);
    
    // If this is a review of a specific swing from the inbox, save the session to Cosmos DB
    if (videoId) {
      try {
        // First, get the swing data
        const response = await fetch(`/api/videos?id=${videoId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch swing: ${response.status}`);
        }
        
        const swings = await response.json();
        if (swings && swings.length > 0) {
          const swing = swings[0];
          
          // Check if this is individual swing or swing within a session
          const isSwingId = videoId.includes('swing-');
          
          if (isSwingId) {
            console.log("Processing swing within a session...");
            
            // Find which session contains this swing
            const sessionQueryResponse = await fetch(`/api/videos/session?swingId=${videoId}`);
            
            if (sessionQueryResponse.ok) {
              const sessionData = await sessionQueryResponse.json();
              console.log("Found session data:", sessionData.id);
              
              // Update the swing within the session
              if (sessionData && sessionData.id) {
                // Merge the review session with the swing
                const swingWithSession = {
                  ...swing,
                  status: "Completed",
                  reviewSession: session
                };
                
                // Update the swing
                const updateSwingResponse = await fetch('/api/videos/updateSwing', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    sessionId: sessionData.id,
                    swing: swingWithSession
                  })
                });
                
                if (updateSwingResponse.ok) {
                  console.log("Saved review session to Cosmos DB and updated swing status to Completed");
                } else {
                  console.error("Failed to update swing within session:", await updateSwingResponse.text());
                }
              }
            } else {
              console.error("Failed to find session for swing:", await sessionQueryResponse.text());
              
              // Fallback: try to update the swing directly as standalone
              const updateResponse = await fetch('/api/videos', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ...swing,
                  status: "Completed",
                  reviewSession: session
                })
              });
              
              if (updateResponse.ok) {
                console.log("Saved review session to standalone swing");
              } else {
                console.error("Failed to update swing:", await updateResponse.text());
              }
            }
          } else {
            // Direct video update (not a swing within a session)
            const updateResponse = await fetch('/api/videos', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...swing,
                status: "Completed",
                reviewSession: session
              })
            });
            
            if (updateResponse.ok) {
              console.log("Saved review session to Cosmos DB and updated status to Completed");
            } else {
              console.error("Failed to update video with review session:", await updateResponse.text());
            }
          }
        }
      } catch (error) {
        console.error("Error saving review session:", error);
      }
    }
    
    // Update session availability
    if (typeof window !== 'undefined') {
      window.__hasRecordedSession = true;
      
      // Dispatch a custom event to notify about session availability
      const event = new CustomEvent('session-available');
      window.dispatchEvent(event);
    }
  }, [videoId]);

  return (
    <div className="min-h-screen p-4">
      <main className="max-w-6xl mx-auto">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <div className="flex space-x-2">
              <button
                onClick={() => document.getElementById(isClient && isRecording ? 'stopButton' : 'startRecordingButton')?.click()}
                disabled={isReplayMode || (isVideoLoading && !isRecording)}
                className={
                  isReplayMode || (isVideoLoading && !isRecording) 
                    ? "bg-gray-300 text-gray-500 py-2 px-4 rounded-md" 
                    : isClient && isRecording 
                      ? "bg-gray-700 text-white py-2 px-4 rounded-md" 
                      : "bg-red-500 text-white py-2 px-4 rounded-md"
                }
              >
                {isClient && isRecording 
                  ? "Stop" 
                  : isVideoLoading && !isRecording
                    ? "Loading video, please wait..." 
                    : "Record"
                }
              </button>
              
              <button
                onClick={() => document.getElementById(isReplayMode ? 'stopButton' : 'startReplayButton')?.click()}
                disabled={isClient && 
                  (isRecording || 
                   (!hasRecordedSession && !isReplayMode) || 
                   (hasRecordedSession && !isSessionReady && !isReplayMode))}
                className={
                  isClient && 
                    (isRecording || 
                     (!hasRecordedSession && !isReplayMode) || 
                     (hasRecordedSession && !isSessionReady && !isReplayMode))
                    ? "bg-gray-300 text-gray-500 py-2 px-4 rounded-md" 
                    : isReplayMode 
                      ? "bg-yellow-500 text-white py-2 px-4 rounded-md" 
                      : "bg-green-600 text-white py-2 px-4 rounded-md"
                }
              >
                {isReplayMode 
                  ? "Stop Replay" 
                  : (hasRecordedSession && !isSessionReady) 
                    ? "Loading..." 
                    : "Replay Session"
                }
              </button>
            </div>
          </div>
        </div>
        
        {/* Display video title and description from URL parameter */}
        {videoId && contentToReview && (
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-semibold dark:text-white">{contentToReview.videoTitle}</h2>
            <p className="text-gray-600 dark:text-gray-300">{contentToReview.videoDescription}</p>
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Categories Section */}
          {contentToReview && <div className="lg:w-1/5">
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 h-full">
              <h2 className="text-xl font-semibold mb-3 dark:text-white">{contentToReview.dataLabelingTitle}</h2>
              
              {/* Show rating stars during recording mode */}
              {!isReplayMode ? (
                <div className="space-y-3">
                  {contentToReview.labelProperties?.map((property) => (
                    <div key={property.id}>
                      <div className="mb-1 dark:text-white">{property.label}</div>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleCategoryChange(property.id, star)}
                            className={(categories[property.id] ?? 0) >= star ? "text-xl px-1 text-yellow-400" : "text-xl px-1 text-gray-300 dark:text-gray-600"}
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
                  {contentToReview && (
                    <>
                      <ul className="space-y-3">
                        {contentToReview.labelProperties?.map((property) => (
                          <li key={property.id}>
                            <div className="font-medium dark:text-white">{property.label}</div>
                            <div className="flex text-yellow-400 mt-1 text-base">
                              {[1, 2, 3, 4, 5].map((star) => {
                                // Find if we have a rating for this category from replay data
                                // First check by ID (most reliable)
                                const ratingCategoryById = categoryList.find(cat => 
                                  cat.id && cat.id === property.id
                                );
                                
                                // Then check by name if ID match failed
                                const ratingCategoryByName = !ratingCategoryById ? categoryList.find(cat => 
                                  cat.name?.toLowerCase() === property.label.toLowerCase() ||
                                  cat.name?.toLowerCase().replace(/\s+/g, '') === property.label.toLowerCase().replace(/\s+/g, '')
                                ) : null;
                                
                                // Also check if we have a direct match in the categories object
                                const directRating = categories[property.id];
                                
                                // Use the first available rating
                                const rating = directRating || 
                                              ratingCategoryById?.rating || 
                                              ratingCategoryByName?.rating || 
                                              0;
                                
                                // Debug ratings for the first category
                                if (property.id === "setupAlignment") {
                                  console.log(`Rating for ${property.label}: directRating=${directRating}, byId=${ratingCategoryById?.rating}, byName=${ratingCategoryByName?.rating}, final=${rating}`);
                                }
                                
                                return (
                                  <span key={star} className={star <= rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}>
                                    ★
                                  </span>
                                );
                              })}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {categoryList.length > 0 ? `${categoryList.length} ${categoryList.length === 1 ? 'category' : 'categories'} rated` : 'No ratings yet'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>}
          
          {/* Video Player */}
          <div className="lg:w-3/5">
            {contentToReview ? <VideoPlayerWrapper 
              categories={categories}
              onCategoriesCleared={clearCategories}
              onCategoriesLoaded={handleCategoryAddedDuringReplay}
              onReplayModeChange={handleReplayModeChange}
              onVideoLoadingChange={setIsVideoLoading}
              videoUrl={contentToReview.videoUrl}
              videoId={contentToReview.videoTitle?.replace(/\s+/g, '-').toLowerCase()}
              contentToReview={contentToReview}
              initialSession={savedReviewSession}
              onSessionComplete={onSessionComplete}
            /> : <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">Please select a video to review</p>
            </div>}
            
            {/* Session Data Controls */}
            {hasRecordedSession && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-2 dark:text-white">Recorded Session</h3>
                <div className="flex space-x-2">
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
            )}
          </div>
          
          {/* Key Metrics Section */}
          {contentToReview?.keyMetrics && contentToReview.keyMetrics.length > 0 && (
            <div className="lg:w-1/5">
              <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 h-full">
                <h2 className="text-xl font-semibold mb-3 dark:text-white">{contentToReview.keyMetricsTitle || "Key Metrics"}</h2>
                <div className="flex flex-col gap-3">
                  {contentToReview.keyMetrics.map((metric, index) => (
                    <div key={index} className="p-2 bg-white dark:bg-gray-700 rounded shadow-sm">
                      <span className="block text-xs text-gray-500 dark:text-gray-300">{metric.name}</span>
                      <span className="text-lg font-semibold dark:text-white">{metric.value}</span>
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

// Main page component with Suspense boundary for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}