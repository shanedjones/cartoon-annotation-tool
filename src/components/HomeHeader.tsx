'use client';
import { useState } from 'react';

interface HomeHeaderProps {
  isVideoLoading: boolean;
  isRecording: boolean;
  isReplayMode: boolean;
  isSaving: boolean;
  isSavingComplete: boolean;
  isCompletedVideo: boolean;
  hasRecordedSession: boolean;
  isSessionReady: boolean;
  isClient: boolean;
  videoTitle?: string;
  videoDescription?: string;
}

export default function HomeHeader({
  isVideoLoading,
  isRecording,
  isReplayMode,
  isSaving,
  isSavingComplete,
  isCompletedVideo,
  hasRecordedSession,
  isSessionReady,
  isClient,
  videoTitle,
  videoDescription
}: HomeHeaderProps) {
  return (
    <>
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
      {videoTitle && (
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
          <h2 className="text-xl font-semibold dark:text-white">{videoTitle}</h2>
          <p className="text-gray-600 dark:text-gray-300">{videoDescription}</p>
        </div>
      )}
    </>
  );
}