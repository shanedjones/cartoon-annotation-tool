'use client';
import Link from "next/link";
import VideoPlayerWrapper from "../src/components/VideoPlayerWrapper";
import { useState, useCallback, useEffect, Suspense } from "react";
import type { FeedbackSession } from "@/src/components/FeedbackOrchestrator";
import { useSearchParams } from 'next/navigation';
import HomeHeader from "@/src/components/HomeHeader";
import CategoryPanel from "@/src/components/CategoryPanel";
import KeyMetricsPanel from "@/src/components/KeyMetricsPanel";
import SessionControls from "@/src/components/SessionControls";

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
    // Reset states when videoId changes
    if (typeof window !== 'undefined') {
      window.__hasRecordedSession = false;
      window.__isCompletedVideo = false;
      setHasRecordedSession(false);
      setIsCompletedVideo(false);
      clearCategories();
    }
    
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
  }, [hasRecordedSession, isCompletedVideo, isSessionReady, isRecording, isSaving, isSavingComplete, isReplayMode]);
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
        <HomeHeader 
          isVideoLoading={isVideoLoading}
          isRecording={isRecording}
          isReplayMode={isReplayMode}
          isSaving={isSaving}
          isSavingComplete={isSavingComplete}
          isCompletedVideo={isCompletedVideo}
          hasRecordedSession={hasRecordedSession}
          isSessionReady={isSessionReady}
          isClient={isClient}
          videoTitle={contentToReview?.videoTitle}
          videoDescription={contentToReview?.videoDescription}
        />
        
        <div className="flex flex-col lg:flex-row gap-4">
          {}
          {contentToReview && <div className="lg:w-1/5">
            <CategoryPanel 
              dataLabelingTitle={contentToReview.dataLabelingTitle}
              labelProperties={contentToReview.labelProperties}
              categories={categories}
              isRecording={isRecording}
              isCompletedVideo={isCompletedVideo}
              isReplayMode={isReplayMode}
              categoryList={categoryList}
              handleCategoryChange={handleCategoryChange}
            />
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
            
            <SessionControls 
              hasRecordedSession={hasRecordedSession}
              isRecording={isRecording}
              isClient={isClient}
            />
          </div>
          
          {}
          {contentToReview?.keyMetrics && contentToReview.keyMetrics.length > 0 && (
            <div className="lg:w-1/5">
              <KeyMetricsPanel 
                keyMetricsTitle={contentToReview.keyMetricsTitle}
                keyMetrics={contentToReview.keyMetrics}
              />
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