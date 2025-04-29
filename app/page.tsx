'use client';
import Link from "next/link";
import VideoPlayerWrapper from "../src/components/VideoPlayerWrapper";
import { useState, useCallback, useEffect, Suspense } from "react";
import type { FeedbackSession } from "@/src/components/FeedbackOrchestrator";
import { useSearchParams } from 'next/navigation';
function HomeContent() {
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
  const searchParams = useSearchParams();
  const videoId = searchParams.get('videoId');
  const [contentToReview, setContentToReview] = useState<ReviewContent | null>(null);
  useEffect(() => {
    if (!videoId) {
      setContentToReview(null);
      return;
    }
    const loadVideoData = async () => {
      try {
        const response = await fetch(`/api/videos?id=${videoId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status}`);
        }
        const videos = await response.json();
        if (videos && videos.length > 0) {
          const selectedVideo = videos[0];
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
          if (selectedVideo.reviewSession) {
            setSavedReviewSession(selectedVideo.reviewSession);
            if (selectedVideo.status === "Completed") {
              (window as any).__hasRecordedSession = true;
              (window as any).__isCompletedVideo = true;
              const event = new CustomEvent('session-available');
              window.dispatchEvent(event);
              if (selectedVideo.reviewSession.categories) {
                const savedCategories: Record<string, number> = {};
                Object.entries(selectedVideo.reviewSession.categories).forEach(([key, value]) => {
                  if (typeof value === 'boolean') {
                    savedCategories[key] = value ? 1 : 0;
                  } else if (typeof value === 'number') {
                    savedCategories[key] = value;
                  }
                });
                if (Object.keys(savedCategories).length > 0) {
                  const formattedCategories = Object.entries(savedCategories)
                    .filter(([_, rating]) => rating !== null && rating > 0)
                    .map(([categoryName, rating]) => ({
                      id: categoryName,
                      name: getCategoryLabel(categoryName),
                      rating: rating as number
                    }));
                  if (formattedCategories.length > 0) {
                    setCategoryList(formattedCategories);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
      }
    };
    loadVideoData();
  }, [videoId]);
  const [categories, setCategories] = useState<Record<string, number | null>>({});
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [categoryList, setCategoryList] = useState<{id?: string, name: string, rating: number}[]>([]);
  const [hasRecordedSession, setHasRecordedSession] = useState(false);
  const [isCompletedVideo, setIsCompletedVideo] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingComplete, setIsSavingComplete] = useState(false);
  const getCategoryLabel = (category: string) => {
    return category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
  };
  const handleCategoryChange = (category: string, rating: number) => {
    const newCategories = {
      ...categories,
      [category]: rating,
    };
    setCategories(newCategories);
    if (typeof window !== 'undefined') {
      try {
        if (window.__videoPlayerWrapper?.recordCategoryChange) {
          window.__videoPlayerWrapper.recordCategoryChange(category, rating);
        }
      } catch (error) {
      }
    }
  };
  const clearCategories = useCallback(() => {
    const resetCategories = Object.keys(categories).reduce((acc, key) => {
      acc[key] = null;
      return acc;
    }, {} as Record<string, number | null>);
    setCategories(resetCategories);
    setCategoryList([]);
  }, [categories]);
  const handleCategoryAddedDuringReplay = useCallback((categoryChanges: Record<string, number>) => {
    const ratedCategories = Object.entries(categoryChanges)
      .filter(([_, rating]) => rating !== null && rating > 0)
      .map(([categoryName, rating]) => {
        const label = getCategoryLabel(categoryName);
        return {
          id: categoryName,
          name: label,
          rating: rating as number
        };
      });
    if (ratedCategories.length > 0) {
      const newList = [...ratedCategories];
      setCategoryList(newList);
      setTimeout(() => {
        setCategoryList(prevList => {
          return prevList;
        });
      }, 50);
    } else {
      setCategoryList([]);
    }
  }, []);
  const handleReplayModeChange = useCallback((isReplay: boolean) => {
    setIsReplayMode(isReplay);
    if (isReplay && typeof window !== 'undefined') {
      window.__isReplaying = true;
    } else if (typeof window !== 'undefined') {
      window.__isReplaying = false;
    }
    if (isReplay) {
      setCategoryList([]);
    }
  }, []);
  useEffect(() => {
    const checkState = () => {
      if (typeof window !== 'undefined') {
        let wasRecording = false;
        if (window.__videoPlayerWrapper) {
          wasRecording = isRecording;
          const currentlyRecording = !!window.__videoPlayerWrapper.isRecording;
          setIsRecording(currentlyRecording);
          if (wasRecording && !currentlyRecording && !isSaving && !isSavingComplete) {
            setIsSaving(true);
          }
        }
        const hasSession = !!window.__hasRecordedSession;
        if (hasSession !== hasRecordedSession) {
          setHasRecordedSession(hasSession);
          if (hasSession && isSaving) {
            setIsSaving(false);
            setIsSavingComplete(true);
            setIsCompletedVideo(true);
          }
        }
        const isCompleted = !!window.__isCompletedVideo;
        if (isCompleted !== isCompletedVideo) {
          setIsCompletedVideo(isCompleted);
          if (isCompleted && isSaving) {
            setIsSaving(false);
            setIsSavingComplete(true);
          }
        }
        const sessionReady = !!window.__sessionReady;
        if (sessionReady !== isSessionReady) {
          setIsSessionReady(sessionReady);
        }
        const isReplayActive = !!window.__isReplaying;
        if (isReplayActive !== isReplayMode) {
          setIsReplayMode(isReplayActive);
        }
      }
    };
    checkState();
    const interval = setInterval(checkState, 300);
    const handleSessionChange = () => {
      checkState();
    };
    const handleSessionReady = () => {
      checkState();
    };
    window.addEventListener('session-available', handleSessionChange);
    window.addEventListener('session-ready', handleSessionReady);
    return () => {
      clearInterval(interval);
      window.removeEventListener('session-available', handleSessionChange);
      window.removeEventListener('session-ready', handleSessionReady);
    };
  }, [hasRecordedSession, isCompletedVideo, isSessionReady, isRecording, isSaving, isSavingComplete]);
  const [isClient, setIsClient] = useState(false);
  const [savedReviewSession, setSavedReviewSession] = useState(null);
  useEffect(() => {
    setIsClient(true);
  }, []);
  useEffect(() => {
    if (contentToReview?.labelProperties) {
      const initialCats = contentToReview.labelProperties.reduce((acc, prop) => {
        acc[prop.id] = null;
        return acc;
      }, {} as Record<string, number | null>);
      setCategories(initialCats);
    }
  }, [contentToReview]);
  const onSessionComplete = useCallback(async (session: FeedbackSession) => {
    if (videoId) {
      try {
        const response = await fetch(`/api/videos?id=${videoId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch swing: ${response.status}`);
        }
        const swings = await response.json();
        if (swings && swings.length > 0) {
          const swing = swings[0];
          const isSwingId = videoId.includes('swing-');
          if (isSwingId) {
            const sessionQueryResponse = await fetch(`/api/videos/session?swingId=${videoId}`);
            if (sessionQueryResponse.ok) {
              const sessionData = await sessionQueryResponse.json();
              if (sessionData && sessionData.id) {
                const swingWithSession = {
                  ...swing,
                  status: "Completed",
                  reviewSession: session
                };
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
                } else {
                }
              }
            } else {
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
              } else {
              }
            }
          } else {
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
            } else {
            }
          }
        }
      } catch (error) {
      }
    }
    if (typeof window !== 'undefined') {
      window.__hasRecordedSession = true;
      const event = new CustomEvent('session-available');
      window.dispatchEvent(event);
      setIsSaving(false);
      setIsSavingComplete(true);
      setIsCompletedVideo(true);
    }
  }, [videoId]);
  return (
    <div className="min-h-screen p-4">
      <main className="max-w-6xl mx-auto">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <div className="flex space-x-2">
              {}
              {isSaving ? (
                <span className="text-gray-500 py-2 px-4">Saving...</span>
              ) : isSavingComplete ? (
                <span className="py-2 px-4">Recording saved.</span>
              ) : (
                !isCompletedVideo && !isRecording && (
                  <button
                    onClick={() => document.getElementById('startRecordingButton')?.click()}
                    disabled={isReplayMode || isVideoLoading}
                    className={
                      isReplayMode || isVideoLoading
                        ? "!bg-gray-300 !text-gray-500 py-2 px-4 rounded-md cursor-not-allowed"
                        : "!bg-green-600 !text-white py-2 px-4 rounded-md"
                    }
                  >
                    {isVideoLoading
                      ? "Loading video..."
                      : "Start Recording"
                    }
                  </button>
                )
              )}
              {}
              {isRecording && (
                <button
                  onClick={() => document.getElementById('stopButton')?.click()}
                  className="!bg-red-500 !text-white py-2 px-4 rounded-md"
                >
                  Stop Recording
                </button>
              )}
              {}
              {(isCompletedVideo || hasRecordedSession || isReplayMode) && !isSavingComplete && !isSaving && (
                <button
                  onClick={() => document.getElementById(isReplayMode ? 'stopButton' : 'startReplayButton')?.click()}
                  disabled={isClient &&
                    (isRecording ||
                    isVideoLoading ||
                    (!hasRecordedSession && !isReplayMode) ||
                    (hasRecordedSession && !isSessionReady && !isReplayMode))}
                  className={
                    isClient &&
                      (isRecording ||
                      isVideoLoading ||
                      (!hasRecordedSession && !isReplayMode) ||
                      (hasRecordedSession && !isSessionReady && !isReplayMode))
                      ? "!bg-gray-300 !text-gray-500 py-2 px-4 rounded-md cursor-not-allowed"
                      : isReplayMode
                        ? "!bg-yellow-500 !text-white py-2 px-4 rounded-md"
                        : "!bg-green-600 !text-white py-2 px-4 rounded-md"
                  }
                >
                  {isReplayMode
                    ? "Stop Replay"
                    : (hasRecordedSession && !isSessionReady) || isVideoLoading
                      ? "Loading..."
                      : "Replay Session"
                  }
                </button>
              )}
            </div>
          </div>
        </div>
        {}
        {videoId && contentToReview && (
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-semibold dark:text-white">{contentToReview.videoTitle}</h2>
            <p className="text-gray-600 dark:text-gray-300">{contentToReview.videoDescription}</p>
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-4">
          {}
          {contentToReview && <div className="lg:w-1/5">
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 h-full">
              <h2 className="text-xl font-semibold mb-3 dark:text-white">{contentToReview.dataLabelingTitle}</h2>
              {}
              {!isRecording && isCompletedVideo ? (
                <div>
                  {contentToReview && (
                    <>
                      <ul className="space-y-3">
                        {contentToReview.labelProperties?.map((property) => (
                          <li key={property.id}>
                            <div className="font-medium dark:text-white">{property.label}</div>
                            <div className="flex mt-1 space-x-2">
                              {}
                              {(() => {
                                const ratingCategoryById = categoryList.find(cat =>
                                  cat.id && cat.id === property.id
                                );
                                const ratingCategoryByName = !ratingCategoryById ? categoryList.find(cat =>
                                  cat.name?.toLowerCase() === property.label.toLowerCase() ||
                                  cat.name?.toLowerCase().replace(/\s+/g, '') === property.label.toLowerCase().replace(/\s+/g, '')
                                ) : null;
                                const directRating = categories[property.id];
                                const rating = directRating ||
                                              ratingCategoryById?.rating ||
                                              ratingCategoryByName?.rating ||
                                              0;
                                if (property.id === "setupAlignment") {
                                }
                                switch(rating) {
                                  case 1:
                                    return <div className="w-8 h-8 rounded-full !bg-red-500 !border-2 !border-red-500" title="Red rating" />;
                                  case 2:
                                    return <div className="w-8 h-8 rounded-full !bg-yellow-300 !border-2 !border-yellow-400" title="Yellow rating" />;
                                  case 3:
                                    return <div className="w-8 h-8 rounded-full !bg-green-500 !border-2 !border-green-500" title="Green rating" />;
                                  default:
                                    return <div className="w-8 h-8 rounded-full !bg-white !border-2 !border-gray-300 dark:!border-gray-500" title="No rating" />;
                                }
                              })()}
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
              ) : isReplayMode ? (
                <div>
                  {contentToReview && (
                    <>
                      <ul className="space-y-3">
                        {contentToReview.labelProperties?.map((property) => (
                          <li key={property.id}>
                            <div className="font-medium dark:text-white">{property.label}</div>
                            <div className="flex mt-1 space-x-2">
                              {}
                              {(() => {
                                const ratingCategoryById = categoryList.find(cat =>
                                  cat.id && cat.id === property.id
                                );
                                const ratingCategoryByName = !ratingCategoryById ? categoryList.find(cat =>
                                  cat.name?.toLowerCase() === property.label.toLowerCase() ||
                                  cat.name?.toLowerCase().replace(/\s+/g, '') === property.label.toLowerCase().replace(/\s+/g, '')
                                ) : null;
                                const directRating = categories[property.id];
                                const rating = directRating ||
                                              ratingCategoryById?.rating ||
                                              ratingCategoryByName?.rating ||
                                              0;
                                switch(rating) {
                                  case 1:
                                    return <div className="w-8 h-8 rounded-full !bg-red-500 !border-2 !border-red-500" title="Red rating" />;
                                  case 2:
                                    return <div className="w-8 h-8 rounded-full !bg-yellow-300 !border-2 !border-yellow-400" title="Yellow rating" />;
                                  case 3:
                                    return <div className="w-8 h-8 rounded-full !bg-green-500 !border-2 !border-green-500" title="Green rating" />;
                                  default:
                                    return <div className="w-8 h-8 rounded-full !bg-white !border-2 !border-gray-300 dark:!border-gray-500" title="No rating" />;
                                }
                              })()}
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
              ) : (
                <div className="space-y-3">
                  {contentToReview.labelProperties?.map((property) => (
                    <div key={property.id}>
                      <div className="mb-1 dark:text-white">{property.label}</div>
                      <div className="flex items-center space-x-2">
                        {}
                        <button
                          type="button"
                          onClick={() => handleCategoryChange(property.id, 1)}
                          className={`w-8 h-8 rounded-full !outline-none !border-2 ${(categories[property.id] ?? 0) === 1 ? "!bg-red-500 !border-red-500" : "!bg-white !border-red-500 hover:!bg-red-100"}`}
                          aria-label="Red rating"
                        />
                        <button
                          type="button"
                          onClick={() => handleCategoryChange(property.id, 2)}
                          className={`w-8 h-8 rounded-full !outline-none !border-2 ${(categories[property.id] ?? 0) === 2 ? "!bg-yellow-300 !border-yellow-400" : "!bg-white !border-yellow-400 hover:!bg-yellow-100"}`}
                          aria-label="Yellow rating"
                        />
                        <button
                          type="button"
                          onClick={() => handleCategoryChange(property.id, 3)}
                          className={`w-8 h-8 rounded-full !outline-none !border-2 ${(categories[property.id] ?? 0) === 3 ? "!bg-green-500 !border-green-500" : "!bg-white !border-green-500 hover:!bg-green-100"}`}
                          aria-label="Green rating"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>}
          {}
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
            {}
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
          {}
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
export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}