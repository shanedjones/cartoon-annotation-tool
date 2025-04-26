'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioChunk {
  blob: Blob | string;      // The audio data as Blob or string (for serialization)
  startTime: number;        // Relative to recording start
  duration: number;         // Length of audio chunk in ms
  videoTime: number;        // Video timestamp when this audio was recorded
  url?: string;             // URL for playback (created during replay)
  mimeType?: string;        // MIME type for proper playback
  blobUrl?: string;         // URL for the Azure Storage blob 
}

interface AudioRecorderProps {
  isRecording: boolean;
  isReplaying: boolean;
  currentVideoTime: number;
  onAudioChunk?: (chunk: AudioChunk) => void;
  replayAudioChunks?: AudioChunk[];
}

export default function AudioRecorder({
  isRecording,
  isReplaying,
  currentVideoTime,
  onAudioChunk,
  replayAudioChunks = []
}: AudioRecorderProps) {
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingFormat, setRecordingFormat] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Refs for managing audio recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs for managing audio playback during replay
  const audioPlayersRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const playingChunksRef = useRef<Set<number>>(new Set());
  
  // Check for audio permission when component mounts
  useEffect(() => {
    const checkAudioPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioPermissionGranted(true);
        
        // Stop the tracks after permission check
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        
        setError('Microphone access denied. Please enable microphone permissions in your browser.');
        setAudioPermissionGranted(false);
      }
    };
    
    checkAudioPermission();
  }, []);
  
  // Start or stop recording based on props
  useEffect(() => {
    if (isRecording && audioPermissionGranted && !isRecordingAudio) {
      // We intentionally set recordingStartTimeRef.current to null here
      // to ensure a clean start for each new recording session.
      // It will be properly set in startAudioRecording() before the recorder starts.
      recordingStartTimeRef.current = null;
      
      
      startAudioRecording();
    } else if (!isRecording && isRecordingAudio) {
      
      stopAudioRecording();
    }
    
    // Clean up on unmount
    return () => {
      if (isRecordingAudio) {
        stopAudioRecording();
      }
      cleanupAudioPlayers();
    };
  }, [isRecording, audioPermissionGranted, isRecordingAudio]);
  
  // Start recording audio
  const startAudioRecording = async () => {
    try {
      // Reset state
      chunksRef.current = [];
      setElapsedTime(0);
      setError(null);
      
      // Request microphone access with quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Mono for voice clarity
          sampleRate: 48000 // Higher sample rate for better quality
        }
      });
      
      streamRef.current = stream;
      
      // Find the best supported audio format
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
      
      setRecordingFormat(mimeType || 'default format');
      
      
      // Create recorder with quality settings
      const recorderOptions = {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000
      };
      
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      
      // Handle data available event
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      // Handle recording stop
      recorder.onstop = async () => {
        if (chunksRef.current.length === 0) {
          
          return;
        }
        
        const audioBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        
        // Check if recordingStartTimeRef is set, if not use current time as fallback
        if (!recordingStartTimeRef.current) {
          
          recordingStartTimeRef.current = Date.now() - (elapsedTime * 1000);
        }
        
        // Calculate the actual duration of the recording based on the current time
        const now = Date.now();
        const calculatedDuration = recordingStartTimeRef.current ? now - recordingStartTimeRef.current : 0;
        
        // Compare the timer-based duration with the calculated duration
        
        // Use the calculated duration if it's greater than 0, otherwise fall back to the timer-based duration
        const finalDuration = calculatedDuration > 0 ? calculatedDuration : elapsedTime * 1000;
        
        // Only create and report the audio chunk if we have valid data
        if (audioBlob.size > 0 && recordingStartTimeRef.current && onAudioChunk) {
          try {
            // Create the audio chunk with all required properties
            const audioChunk: AudioChunk = {
              blob: audioBlob,
              startTime: recordingStartTimeRef.current,
              duration: finalDuration, // Use the calculated duration in ms
              videoTime: currentVideoTime * 1000, // Convert to ms
              mimeType: mimeType || 'audio/webm', // Store the MIME type explicitly
            };
            
            // Pass the chunk to the parent component
            onAudioChunk(audioChunk);
            
          } catch (error) {
            
            setError(`Failed to process audio recording: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
        }
        
        // Stop all tracks to release the microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Clear the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        setIsRecordingAudio(false);
      };
      
      // Start the recorder and explicitly set the recording start time
      // CRITICAL: This is where we set the recordingStartTimeRef that will be used
      // to calculate audio chunk duration and is essential for proper audio recording
      const startTime = Date.now();
      recordingStartTimeRef.current = startTime;
      
      
      
      // Start the recorder AFTER setting the start time reference to ensure proper timing
      recorder.start();
      setIsRecordingAudio(true);
      
      // Double-check that the start time was set correctly
      if (!recordingStartTimeRef.current) {
        
        // Emergency fallback - set it again
        recordingStartTimeRef.current = Date.now();
        
      }
      
      // Update elapsed time every second
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      
      setError(`Could not start recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Stop recording
  const stopAudioRecording = () => {
    // First, capture the final duration info before stopping
    // This helps ensure we have valid timing information for the recording
    const recordingEndTime = Date.now();
    const finalElapsedTimeMs = elapsedTime * 1000; // Convert seconds to ms
    
    // If recordingStartTimeRef is missing, try to reconstruct it from elapsed time
    if (!recordingStartTimeRef.current) {
      
      recordingStartTimeRef.current = recordingEndTime - finalElapsedTimeMs;
      
    }
    
    // Calculate duration for logging
    const calculatedDuration = recordingStartTimeRef.current 
      ? recordingEndTime - recordingStartTimeRef.current 
      : 0;
      
    
    // Now stop the media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        
      }
    }
    
    // Ensure stream is stopped
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecordingAudio(false);
    // We've already handled any null recordingStartTimeRef, now we can clear it
    recordingStartTimeRef.current = null;
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Enhanced helper function to convert data URL to Blob
  const dataURLToBlob = (dataURL: string): Blob => {
    try {
      // More comprehensive validation of data URL format
      if (!dataURL || typeof dataURL !== 'string') {
        
        throw new Error('Invalid data URL: not a string or empty');
      }
      
      if (!dataURL.startsWith('data:')) {
        
        throw new Error('Invalid data URL format - missing data: prefix');
      }
      
      // Split the data URL into parts - header and payload
      const parts = dataURL.split(',');
      if (parts.length !== 2) {
        
        throw new Error('Invalid data URL format - wrong number of parts');
      }
      
      // Extract the MIME type with better validation
      const headerPart = parts[0];
      let mime = 'audio/webm'; // Default fallback
      
      // More robust MIME type extraction
      const mimeMatch = headerPart.match(/^data:(.*?)(;base64)?$/);
      if (mimeMatch && mimeMatch[1]) {
        mime = mimeMatch[1];
      } else {
        
      }
      
      // Verify that we have a base64 encoded payload
      if (!headerPart.includes(';base64')) {
        
      }
      
      // Get base64 data
      const base64Data = parts[1];
      if (!base64Data) {
        
        throw new Error('Empty base64 data in data URL');
      }
      
      try {
        // Convert base64 to binary with error handling
        const binary = atob(base64Data);
        
        // Create array buffer with proper size validation
        const arrayBuffer = new ArrayBuffer(binary.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Fill array buffer with binary data
        for (let i = 0; i < binary.length; i++) {
          uint8Array[i] = binary.charCodeAt(i);
        }
        
        // Create and return the blob
        const blob = new Blob([uint8Array], { type: mime });
        
        // Validate the created blob
        if (blob.size === 0) {
          
        } else {
          
        }
        
        return blob;
      } catch (binaryError) {
        
        throw new Error(`Failed to process binary data: ${binaryError instanceof Error ? binaryError.message : String(binaryError)}`);
      }
    } catch (error) {
      
      // Return an empty blob instead of throwing to prevent UI failures
      return new Blob([], { type: 'audio/webm' });
    }
  };

  // Clean up audio players
  const cleanupAudioPlayers = () => {
    audioPlayersRef.current.forEach((player, key) => {
      try {
        player.pause();
        if (player.src && player.src.startsWith('blob:')) {
          URL.revokeObjectURL(player.src);
        }
      } catch (e) {
        
      }
    });
    
    audioPlayersRef.current.clear();
    playingChunksRef.current.clear();
  };
  
  // Handle audio playback during replay
  useEffect(() => {
    if (!isReplaying) {
      // Clean up audio players when not replaying
      cleanupAudioPlayers();
      return;
    }
    
    // Current video time in milliseconds
    const videoTimeMs = currentVideoTime * 1000;
    
    // Process each chunk to determine if it should play
    replayAudioChunks.forEach((chunk, index) => {
      const chunkId = chunk.startTime; // Use startTime as unique ID
      
      }
      
      // Check if this chunk should be playing based on video time
      const shouldPlay = 
        videoTimeMs >= chunk.videoTime && 
        videoTimeMs <= chunk.videoTime + chunk.duration + 500; // Add 500ms buffer
      
      // Is this chunk already playing?
      const isPlaying = playingChunksRef.current.has(chunkId);
      
      
      // If should play but not playing yet
      if (shouldPlay && !isPlaying) {
        // Create audio element if one doesn't exist for this chunk
        if (!audioPlayersRef.current.has(chunkId)) {
          try {
            // Handle blob data in different formats
            let audioUrl: string;
            
            try {
              // Check for Azure Storage blob URL first
              if (chunk.blobUrl) {
                // Use the Azure Storage blob URL if available
                audioUrl = chunk.blobUrl;
                
                
                // We'll handle the CORS issue by using Audio element directly
                // instead of trying to fetch the blob first
              }
              // Fall back to local URLs if no Azure Storage blob URL is available
              else if (chunk.url) {
                // Use provided URL if available
                audioUrl = chunk.url;
                
              } else if (chunk.blob instanceof Blob) {
                // Create URL from Blob
                audioUrl = URL.createObjectURL(chunk.blob);
              } else if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
                // Data URL - can either use directly or convert to blob first
                
                
                // Option 1: Convert data URL to blob first (more reliable across browsers)
                const convertedBlob = dataURLToBlob(chunk.blob);
                audioUrl = URL.createObjectURL(convertedBlob);
                
                // Option 2 (alternative): Use data URL directly
                // audioUrl = chunk.blob;
                // 
              } else {
                
                if (typeof chunk.blob === 'string') {
                }
                return;
              }
            } catch (formatError) {
              
              return;
            }
            
            // Create and configure audio element
            const audio = new Audio(audioUrl);
            
            // Enhanced error and event handling for debugging
            audio.onloadedmetadata = () => {
            };
            
            audio.oncanplay = () => {
              
            };
            
            audio.onplay = () => {
              
            };
            
            audio.onended = () => {
              
              playingChunksRef.current.delete(chunkId);
              // Only revoke if we created the URL (not for Azure Storage URLs, data URLs, or provided URLs)
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
              
              
              setError(`Audio playback error: ${audio.error?.message || 'Unknown error'}`);
              playingChunksRef.current.delete(chunkId);
              // Only revoke if we created the URL (not for Azure Storage URLs, data URLs, or provided URLs)
              if (!chunk.url && !chunk.blobUrl && chunk.blob instanceof Blob) {
                
                URL.revokeObjectURL(audioUrl);
              }
            };
            
            // Store the audio element
            audioPlayersRef.current.set(chunkId, audio);
          } catch (e) {
            
            return;
          }
        }
        
        // Get the audio element
        const audio = audioPlayersRef.current.get(chunkId);
        if (!audio) return;
        
        // Calculate offset in the audio if needed
        const audioOffset = Math.max(0, (videoTimeMs - chunk.videoTime) / 1000);
        if (audioOffset > 0 && audioOffset < chunk.duration / 1000) {
          audio.currentTime = audioOffset;
        }
        
        // Play the audio
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(error => {
            if (error.name === 'NotAllowedError') {
              setError('Audio playback requires user interaction. Click anywhere to enable audio.');
              
              // Set up a one-time click handler to try again
              const clickHandler = () => {
                audio.play().catch(e => 
                document.removeEventListener('click', clickHandler);
                setError(null);
              };
              document.addEventListener('click', clickHandler, { once: true });
            } else {
              
            }
          });
        }
        
        // Mark as playing
        playingChunksRef.current.add(chunkId);
      } 
      // If should not play but is currently playing
      else if (!shouldPlay && isPlaying) {
        const audio = audioPlayersRef.current.get(chunkId);
        if (audio) {
          audio.pause();
          playingChunksRef.current.delete(chunkId);
        }
      }
    });
    
    // Clean up on unmount or when replay status changes
    return () => {
      cleanupAudioPlayers();
    };
  }, [isReplaying, currentVideoTime, replayAudioChunks]);
  
  return (
    <div className="mb-4">
      {error && (
        <div className="text-red-500 text-sm mb-2 p-2 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}
      
      <div className={`flex items-center ${isRecordingAudio ? 'text-red-500' : 'text-gray-500'}`}>
        {isRecordingAudio && (
          <span className="inline-block h-3 w-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
        )}
        <span className="text-sm font-medium">
          {isRecordingAudio 
            ? `Recording audio: ${formatTime(elapsedTime)}` 
            : isRecording 
              ? 'Microphone ready' 
              : 'Audio recording ready'}
        </span>
        {isRecordingAudio && (
          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
            Live
          </span>
        )}
      </div>
      
      {!audioPermissionGranted && (
        <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
          <span>Microphone access is required for audio recording. Please allow microphone permissions.</span>
        </div>
      )}
      
      {isReplaying && replayAudioChunks && replayAudioChunks.length > 0 && (
        <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1">
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-1 text-gray-500">
            <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
          </svg>
          <span>No audio recordings to replay.</span>
        </div>
      )}
      
      <div className="mt-3 flex flex-wrap gap-2">
        {isRecordingAudio && (
          <div className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
              <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
              <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
            </svg>
            <span>Speak to add verbal feedback</span>
          </div>
        )}
        
        {isRecordingAudio && (
          <div className="text-xs text-gray-500 mt-1">
            Recording format: {recordingFormat}
          </div>
        )}
      </div>
    </div>
  );
}