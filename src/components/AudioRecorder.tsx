'use client';
import React, { useState, useRef, useEffect, useCallback, useReducer } from 'react';
export interface AudioChunk {
  blob: Blob | string;
  startTime: number;
  duration: number;
  videoTime: number;
  url?: string;
  mimeType?: string;
  blobUrl?: string;
}

interface AudioRecorderProps {
  isRecording: boolean;
  isReplaying: boolean;
  currentVideoTime: number;
  onAudioChunk?: (chunk: AudioChunk) => void;
  replayAudioChunks?: AudioChunk[];
}

interface AudioRecorderState {
  isRecordingAudio: boolean;
  audioPermissionGranted: boolean;
  error: string | null;
  recordingFormat: string;
  elapsedTime: number;
}

type AudioRecorderAction =
  | { type: 'START_RECORDING'; format: string }
  | { type: 'STOP_RECORDING' }
  | { type: 'SET_PERMISSION'; granted: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'TICK' }
  | { type: 'RESET_TIMER' };

const initialAudioRecorderState: AudioRecorderState = {
  isRecordingAudio: false,
  audioPermissionGranted: false,
  error: null,
  recordingFormat: '',
  elapsedTime: 0
};
function audioRecorderReducer(state: AudioRecorderState, action: AudioRecorderAction): AudioRecorderState {
  switch (action.type) {
    case 'START_RECORDING':
      return {
        ...state,
        isRecordingAudio: true,
        error: null,
        recordingFormat: action.format,
        elapsedTime: 0
      };
    case 'STOP_RECORDING':
      return {
        ...state,
        isRecordingAudio: false
      };
    case 'SET_PERMISSION':
      return {
        ...state,
        audioPermissionGranted: action.granted,
        error: action.granted ? null : state.error
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error
      };
    case 'TICK':
      return {
        ...state,
        elapsedTime: state.elapsedTime + 1
      };
    case 'RESET_TIMER':
      return {
        ...state,
        elapsedTime: 0
      };
    default:
      return state;
  }
}
function AudioRecorder({
  isRecording,
  isReplaying,
  currentVideoTime,
  onAudioChunk,
  replayAudioChunks = []
}: AudioRecorderProps) {
  const [state, dispatch] = useReducer(audioRecorderReducer, initialAudioRecorderState);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayersRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const playingChunksRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const checkAudioPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        dispatch({ type: 'SET_PERMISSION', granted: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        dispatch({ 
          type: 'SET_ERROR', 
          error: 'Microphone access denied. Please enable microphone permissions in your browser.' 
        });
        dispatch({ type: 'SET_PERMISSION', granted: false });
      }
    };
    checkAudioPermission();
  }, []);
  useEffect(() => {
    if (isRecording && state.audioPermissionGranted && !state.isRecordingAudio) {
      recordingStartTimeRef.current = null;
      startAudioRecording();
    } else if (!isRecording && state.isRecordingAudio) {
      stopAudioRecording();
    }
    return () => {
      if (state.isRecordingAudio) {
        stopAudioRecording();
      }
      cleanupAudioPlayers();
    };
  }, [isRecording, state.audioPermissionGranted, state.isRecordingAudio]);
  const startAudioRecording = async () => {
    try {
      chunksRef.current = [];
      dispatch({ type: 'RESET_TIMER' });
      dispatch({ type: 'SET_ERROR', error: null });
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        }
      });
      streamRef.current = stream;
      
      let mimeType = '';
      const formats = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav'
      ];
      for (const format of formats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          break;
        }
      }
      
      const recorderOptions = {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000
      };
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = async () => {
        if (chunksRef.current.length === 0) {
          return;
        }
        const audioBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        if (!recordingStartTimeRef.current) {
          recordingStartTimeRef.current = Date.now() - (state.elapsedTime * 1000);
        }
        const now = Date.now();
        const calculatedDuration = recordingStartTimeRef.current ? now - recordingStartTimeRef.current : 0;
        const finalDuration = calculatedDuration > 0 ? calculatedDuration : state.elapsedTime * 1000;
        if (audioBlob.size > 0 && recordingStartTimeRef.current && onAudioChunk) {
          try {
            const audioChunk: AudioChunk = {
              blob: audioBlob,
              startTime: recordingStartTimeRef.current,
              duration: finalDuration,
              videoTime: currentVideoTime * 1000,
              mimeType: mimeType || 'audio/webm',
            };
            onAudioChunk(audioChunk);
          } catch (error) {
            dispatch({ 
              type: 'SET_ERROR', 
              error: `Failed to process audio recording: ${error instanceof Error ? error.message : String(error)}` 
            });
          }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        dispatch({ type: 'STOP_RECORDING' });
      };
      const startTime = Date.now();
      recordingStartTimeRef.current = startTime;
      recorder.start();
      
      dispatch({ type: 'START_RECORDING', format: mimeType || 'default format' });
      
      if (!recordingStartTimeRef.current) {
        recordingStartTimeRef.current = Date.now();
      }
      timerRef.current = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        error: `Could not start recording: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  };
  const stopAudioRecording = () => {
    const recordingEndTime = Date.now();
    const finalElapsedTimeMs = state.elapsedTime * 1000;
    if (!recordingStartTimeRef.current) {
      recordingStartTimeRef.current = recordingEndTime - finalElapsedTimeMs;
    }
    const calculatedDuration = recordingStartTimeRef.current
      ? recordingEndTime - recordingStartTimeRef.current
      : 0;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Silently handle errors
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    dispatch({ type: 'STOP_RECORDING' });
    recordingStartTimeRef.current = null;
  };
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);
  const dataURLToBlob = useCallback((dataURL: string): Blob => {
    try {
      if (!dataURL || typeof dataURL !== 'string') {
        throw new Error('Invalid data URL: not a string or empty');
      }
      if (!dataURL.startsWith('data:')) {
        throw new Error('Invalid data URL format - missing data: prefix');
      }
      const parts = dataURL.split(',');
      if (parts.length !== 2) {
        throw new Error('Invalid data URL format - wrong number of parts');
      }
      const headerPart = parts[0];
      let mime = 'audio/webm';
      const mimeMatch = headerPart.match(/^data:(.*?)(;base64)?$/);
      if (mimeMatch && mimeMatch[1]) {
        mime = mimeMatch[1];
      const base64Data = parts[1];
      if (!base64Data) {
        throw new Error('Empty base64 data in data URL');
      }
      try {
        const binary = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(binary.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binary.length; i++) {
          uint8Array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: mime });
        if (blob.size === 0) {
        return blob;
      } catch (binaryError) {
        throw new Error(`Failed to process binary data: ${binaryError instanceof Error ? binaryError.message : String(binaryError)}`);
      }
    } catch (error) {
      return new Blob([], { type: 'audio/webm' });
    }
  }, []);
  const cleanupAudioPlayers = useCallback(() => {
    audioPlayersRef.current.forEach((player, key) => {
      try {
        player.pause();
        if (player.src && player.src.startsWith('blob:')) {
          URL.revokeObjectURL(player.src);
        }
      } catch (e) {
        // Silently handle errors
      }
    });
    audioPlayersRef.current.clear();
    playingChunksRef.current.clear();
  }, []);
  useEffect(() => {
    if (!isReplaying) {
      cleanupAudioPlayers();
      return;
    }
    const videoTimeMs = currentVideoTime * 1000;
    replayAudioChunks.forEach((chunk, index) => {
      const chunkId = chunk.startTime;
      const shouldPlay =
        videoTimeMs >= chunk.videoTime &&
        videoTimeMs <= chunk.videoTime + chunk.duration + 500;
      const isPlaying = playingChunksRef.current.has(chunkId);
      if (shouldPlay && !isPlaying) {
        if (!audioPlayersRef.current.has(chunkId)) {
          try {
            let audioUrl: string;
            try {
              if (chunk.blobUrl) {
                audioUrl = chunk.blobUrl;
              }
              else if (chunk.url) {
                audioUrl = chunk.url;
              } else if (chunk.blob instanceof Blob) {
                audioUrl = URL.createObjectURL(chunk.blob);
              } else if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
                const convertedBlob = dataURLToBlob(chunk.blob);
                audioUrl = URL.createObjectURL(convertedBlob);
              } else {
                if (typeof chunk.blob === 'string') {
                }
                return;
              }
            } catch (formatError) {
              return;
            }
            const audio = new Audio(audioUrl);
            audio.onended = () => {
              playingChunksRef.current.delete(chunkId);
              if (!chunk.url && !chunk.blobUrl && chunk.blob instanceof Blob) {
                URL.revokeObjectURL(audioUrl);
              }
            };
            audio.onerror = () => {
              const errorDetails = {
                errorCode: audio.error?.code,
                errorMessage: audio.error?.message,
                audioSrc: audio.src.substring(0, 50) + '...',
                audioReadyState: audio.readyState,
                chunkDetails: {
                  blobType: chunk.blob instanceof Blob ? 'Blob' : typeof chunk.blob,
                  mimeType: chunk.mimeType,
                  duration: chunk.duration,
                  hasBlobUrl: !!chunk.blobUrl,
                  blobUrlType: chunk.blobUrl ? (chunk.blobUrl.startsWith('/api') ? 'proxy' : 'direct') : 'none'
                }
              };
              dispatch({ type: 'SET_ERROR', error: `Audio playback error: ${audio.error?.message || 'Unknown error'}` });
              playingChunksRef.current.delete(chunkId);
              if (!chunk.url && !chunk.blobUrl && chunk.blob instanceof Blob) {
                URL.revokeObjectURL(audioUrl);
              }
            };
            audioPlayersRef.current.set(chunkId, audio);
          } catch (e) {
            return;
          }
        }
        const audio = audioPlayersRef.current.get(chunkId);
        if (!audio) return;
        const audioOffset = Math.max(0, (videoTimeMs - chunk.videoTime) / 1000);
        if (audioOffset > 0 && audioOffset < chunk.duration / 1000) {
          audio.currentTime = audioOffset;
        }
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(error => {
            if (error.name === 'NotAllowedError') {
              dispatch({ type: 'SET_ERROR', error: 'Audio playback requires user interaction. Click anywhere to enable audio.' });
              const clickHandler = () => {
                audio.play().catch(e => {
                  document.removeEventListener('click', clickHandler);
                  dispatch({ type: 'SET_ERROR', error: null });
                });
              };
              document.addEventListener('click', clickHandler, { once: true });
            } else {
            }
          });
        }
        playingChunksRef.current.add(chunkId);
      }
      else if (!shouldPlay && isPlaying) {
        const audio = audioPlayersRef.current.get(chunkId);
        if (audio) {
          audio.pause();
          playingChunksRef.current.delete(chunkId);
        }
      }
    });
    return () => {
      cleanupAudioPlayers();
    };
  }, [isReplaying, currentVideoTime, replayAudioChunks]);
  return (
    <div className="mb-4">
      {state.error && (
        <div className="text-red-500 text-sm mb-2 p-2 bg-red-50 border border-red-200 rounded">
          {state.error}
        </div>
      )}
      <div className={`flex items-center ${state.isRecordingAudio ? 'text-red-500' : 'text-gray-500'}`}>
        {state.isRecordingAudio && (
          <span className="inline-block h-3 w-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
        )}
        <span className="text-sm font-medium">
          {state.isRecordingAudio
            ? `Recording audio: ${formatTime(state.elapsedTime)}`
            : isRecording
              ? 'Microphone ready'
              : 'Audio recording ready'}
        </span>
        {state.isRecordingAudio && (
          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
            Live
          </span>
        )}
      </div>
      {!state.audioPermissionGranted && (
        <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
          <span>Microphone access is required for audio recording. Please allow microphone permissions.</span>
        </div>
      )}
      {isReplaying && replayAudioChunks && replayAudioChunks.length > 0 && (
        <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1 15c0 1.614.332 3.151.927 4.55.35 1.256 1.518 1.95 2.661 1.95h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
            </svg>
            <span>
              Replaying {replayAudioChunks.length} audio segment{replayAudioChunks.length !== 1 ? 's' : ''}.
              Audio will play automatically at the correct timestamps.
            </span>
          </div>
        </div>
      )}
      {isReplaying && (!replayAudioChunks || replayAudioChunks.length === 0) && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
            <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
          </svg>
          <span>No audio recordings to replay.</span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {state.isRecordingAudio && (
          <div className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
              <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
              <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
            </svg>
            <span>Speak to add verbal feedback</span>
          </div>
        )}
        {state.isRecordingAudio && (
          <div className="text-xs text-gray-500 mt-1">
            Recording format: {state.recordingFormat}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(AudioRecorder);