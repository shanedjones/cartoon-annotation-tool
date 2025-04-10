'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Import the proper VideoPlayer component from the main app
// Use dynamic import to avoid SSR issues
const VideoPlayer = dynamic(() => import('../../src/components/VideoPlayer'), { ssr: false });

// Define AudioChunk interface identical to the one in AudioRecorder.tsx
interface AudioChunk {
  blob: Blob | string;      // The audio data as Blob or string (for serialization)
  startTime: number;        // Relative to recording start
  duration: number;         // Length of audio chunk in ms
  videoTime: number;        // Video timestamp when this audio was recorded
  url?: string;             // URL for playback (created during replay)
  mimeType?: string;        // MIME type for proper playback
}

// Client-side component for browser info to prevent hydration mismatch
const BrowserInfo = () => {
  const [userAgent, setUserAgent] = useState('Loading...');
  
  useEffect(() => {
    setUserAgent(navigator.userAgent);
  }, []);
  
  return <span>Browser: {userAgent}</span>;
};

// Client-side component for MIME type support to prevent hydration mismatch
const MimeTypesInfo = () => {
  const [supportedTypes, setSupportedTypes] = useState<Record<string, boolean>>({});
  const mimeTypes = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'];
  
  useEffect(() => {
    const support: Record<string, boolean> = {};
    
    mimeTypes.forEach(type => {
      if (typeof MediaRecorder !== 'undefined') {
        support[type] = MediaRecorder.isTypeSupported(type);
      } else {
        support[type] = false;
      }
    });
    
    setSupportedTypes(support);
  }, []);
  
  return (
    <>
      <span>Supported MIME types:</span>
      <ul className="pl-4 mt-1">
        {mimeTypes.map(type => (
          <li 
            key={type} 
            className={supportedTypes[type] ? 'text-green-600' : 'text-red-600'}
          >
            {type}: {Object.keys(supportedTypes).length > 0 ? 
              (supportedTypes[type] ? 'Supported' : 'Not supported') : 
              'Checking...'}
          </li>
        ))}
      </ul>
    </>
  );
};

// Simple audio recorder and player for testing - enhanced with serialization testing
export default function AudioTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordingFormat, setRecordingFormat] = useState('');
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  // State for storing the recorded audio blob for serialization testing
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [serializedAudio, setSerializedAudio] = useState<string | null>(null);
  const [deserializedAudio, setDeserializedAudio] = useState<string | null>(null);
  const [audioChunk, setAudioChunk] = useState<AudioChunk | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  
  // State for the programmatic playback test
  const [playbackTestResult, setPlaybackTestResult] = useState<{success: boolean; details?: string} | null>(null);
  const [playbackTestRunning, setPlaybackTestRunning] = useState(false);
  const [syncTestResult, setSyncTestResult] = useState<{success: boolean; details?: string} | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSerializedRef = useRef<HTMLAudioElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  
  // State for tracking video synchronization
  const [syncWithVideo, setSyncWithVideo] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(false);
  
  // Helper function to convert Blob to base64 for storage (copied from VideoPlayerWrapper)
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Helper function to convert base64 back to Blob for playback (copied from VideoPlayerWrapper)
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    try {
      // First ensure we have a proper data URL with the correct format
      if (!base64.includes(',')) {
        throw new Error('Invalid base64 string format - missing comma separator');
      }
      
      // Extract the base64 part after the comma
      const base64Data = base64.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid base64 string - no data after comma');
      }
      
      // Decode the base64 string to binary
      const byteString = atob(base64Data);
      
      // Create an ArrayBuffer to hold the decoded data
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      // Copy the decoded binary data to the array buffer
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      // Create and return a new Blob from the array buffer
      return new Blob([ab], { type: mimeType });
    } catch (error) {
      if (typeof window !== 'undefined') {
        console.error('Error converting base64 to Blob:', error);
      }
      throw error;
    }
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      // Reset state
      chunksRef.current = [];
      setRecordedAudio(null);
      setElapsedTime(0);
      setRecordedBlob(null);
      setSerializedAudio(null);
      setDeserializedAudio(null);
      setAudioChunk(null);
      setDebugInfo({});
      
      // Request microphone access with high quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Mono for voice clarity
          sampleRate: 48000 // Higher sample rate for better quality
        }
      });
      
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
      if (typeof window !== 'undefined') {
        console.log('Using audio format:', mimeType || 'default');
      }
      
      // Create recorder with high quality settings
      const recorderOptions = {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000
      };
      
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      
      // Handle data available event
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      // Handle recording stop
      recorder.onstop = async () => {
        // Always clean up resources in finally block
        try {
          // Create audio blob from chunks
          const audioBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudio(audioUrl);
          setRecordingDuration(elapsedTime);
          setRecordedBlob(audioBlob);
          
          if (typeof window !== 'undefined') {
            console.log('Recording stopped. Blob created:', {
              size: audioBlob.size,
              type: audioBlob.type,
              chunks: chunksRef.current.length
            });
          }
          
          // Use either the recordingStartTime if available, or fallback to current time
          const startTime = recordingStartTime || Date.now();
          if (typeof window !== 'undefined' && !recordingStartTime) {
            console.log('Warning: Recording start time was not set, using fallback time');
          }
          
          // Create an AudioChunk object similar to the one in the main app
          const chunk: AudioChunk = {
            blob: audioBlob,
            startTime: startTime,
            duration: elapsedTime * 1000, // Convert to ms
            videoTime: 0, // No video in this test, so set to 0
            mimeType: mimeType || 'audio/webm',
          };
          setAudioChunk(chunk);
          
          // Directly call our standalone serialization method
          try {
            if (typeof window !== 'undefined') {
              console.log('Calling direct serialization method for audio blob:', {
                size: audioBlob.size,
                type: audioBlob.type
              });
            }
            
            // Call the serializeAndDeserialize method to handle the entire process
            await serializeAndDeserialize(audioBlob, mimeType || 'audio/webm');
          } catch (serializationError) {
            if (typeof window !== 'undefined') {
              console.error('Error in serialization process:', serializationError);
            }
            setDebugInfo({
              serializationError: serializationError instanceof Error ? 
                serializationError.message : String(serializationError),
              stage: 'serialization_process'
            });
          }
        } catch (recordingError) {
          // Handle any errors in the main try block
          if (typeof window !== 'undefined') {
            console.error('Error processing recording:', recordingError);
          }
          setDebugInfo({
            error: recordingError instanceof Error ? 
              recordingError.message : String(recordingError),
            stage: 'recording_processing'
          });
        } finally {
          // Clean up resources
          stream.getTracks().forEach(track => track.stop());
          
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      };
      
      // Start the recorder and timer
      const startTime = Date.now();
      setRecordingStartTime(startTime);
      
      // Log that we're setting the recording start time
      if (typeof window !== 'undefined') {
        console.log('Setting recording start time:', startTime);
      }
      
      recorder.start();
      setIsRecording(true);
      
      // Update elapsed time every second
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      if (typeof window !== 'undefined') {
        console.error('Error starting recording:', error);
        alert(`Could not start recording: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Format seconds as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Direct serialization method (similar to serialization-test page)
  const serializeAndDeserialize = async (blob: Blob, mimeType: string) => {
    if (typeof window !== 'undefined') {
      console.log('Starting direct serializeAndDeserialize method with blob:', {
        size: blob.size,
        type: blob.type,
        mimeType: mimeType
      });
    }
    
    try {
      // Step 1: Convert blob to base64 string
      const startTime1 = performance.now();
      const base64String = await blobToBase64(blob);
      const endTime1 = performance.now();
      
      // Set serialized string state
      setSerializedAudio(base64String);
      
      if (typeof window !== 'undefined') {
        console.log('Base64 conversion complete:', {
          originalSize: blob.size,
          base64Length: base64String.length,
          timeMs: (endTime1 - startTime1).toFixed(2)
        });
      }
      
      // Step 2: Convert base64 back to blob
      if (typeof window !== 'undefined') {
        console.log('Converting base64 back to blob using MIME type:', mimeType || 'audio/webm');
      }
      
      const startTime2 = performance.now();
      const newBlob = base64ToBlob(base64String, mimeType || 'audio/webm');
      const endTime2 = performance.now();
      
      if (typeof window !== 'undefined') {
        console.log('Blob conversion complete:', {
          newSize: newBlob.size, 
          newType: newBlob.type,
          timeMs: (endTime2 - startTime2).toFixed(2)
        });
      }
      
      // Step 3: Create audio URL from new blob
      const deserializedUrl = URL.createObjectURL(newBlob);
      setDeserializedAudio(deserializedUrl);
      
      // Set debug info for display
      setDebugInfo({
        originalBlob: {
          size: blob.size,
          type: blob.type,
          mimeType: mimeType || 'audio/webm'
        },
        base64String: {
          length: base64String.length,
          preview: base64String.substring(0, 50) + '...',
          conversionTimeMs: (endTime1 - startTime1).toFixed(2)
        },
        deserializedBlob: {
          size: newBlob.size,
          type: newBlob.type,
          conversionTimeMs: (endTime2 - startTime2).toFixed(2)
        },
        comparison: {
          sizeMatch: blob.size === newBlob.size,
          typeMatch: blob.type === newBlob.type,
          diffBytes: Math.abs(blob.size - newBlob.size)
        }
      });
      
      return {
        base64String,
        deserializedBlob: newBlob,
        deserializedUrl
      };
    } catch (error) {
      if (typeof window !== 'undefined') {
        console.error('Serialization process failed:', error);
      }
      setDebugInfo(prev => ({
        ...prev,
        serializationError: error instanceof Error ? error.message : String(error)
      }));
      throw error;
    }
  };

  // Create JSON representation of the audio chunk
  const createJsonRepresentation = async () => {
    if (!audioChunk) return;
    
    try {
      // Create a deep copy and convert blob to base64 if needed
      const chunkCopy = {...audioChunk};
      
      if (chunkCopy.blob instanceof Blob) {
        // Convert blob to base64
        chunkCopy.blob = await blobToBase64(chunkCopy.blob);
      }
      
      // Remove url property
      delete chunkCopy.url;
      
      // Return JSON representation
      return JSON.stringify(chunkCopy, null, 2);
    } catch (error) {
      if (typeof window !== 'undefined') {
        console.error('Error creating JSON representation:', error);
      }
      return null;
    }
  };
  
  // Attempt to play an audio chunk programmatically
  const testAudioChunkPlayback = async (chunk: AudioChunk | null) => {
    if (!chunk) {
      console.error('No audio chunk to test');
      return false;
    }
    
    try {
      console.log('Testing audio chunk playback:', {
        blobType: chunk.blob instanceof Blob ? 'Blob' : typeof chunk.blob,
        startTime: chunk.startTime,
        duration: chunk.duration,
        videoTime: chunk.videoTime,
        mimeType: chunk.mimeType || 'unknown'
      });
      
      // Create audio element
      const audio = new Audio();
      
      // Set up event listeners
      return new Promise<boolean>((resolve) => {
        audio.onloadedmetadata = () => {
          console.log('Audio metadata loaded:', {
            duration: audio.duration,
            readyState: audio.readyState
          });
        };
        
        audio.oncanplay = () => {
          console.log('Audio can play now');
          audio.play().catch(error => {
            console.error('Failed to play audio:', error);
            resolve(false);
          });
        };
        
        audio.onplay = () => {
          console.log('Audio playback started');
        };
        
        audio.onended = () => {
          console.log('Audio playback completed successfully');
          resolve(true);
        };
        
        audio.onerror = (e) => {
          console.error('Audio playback error:', {
            error: audio.error?.code,
            message: audio.error?.message
          });
          resolve(false);
        };
        
        // Handle different blob types
        let audioUrl: string;
        if (chunk.url) {
          audioUrl = chunk.url;
        } else if (chunk.blob instanceof Blob) {
          audioUrl = URL.createObjectURL(chunk.blob);
        } else if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
          // Option 1: Convert data URL to blob first
          try {
            // Split the data URL into parts
            const parts = chunk.blob.split(',');
            if (parts.length !== 2) {
              throw new Error('Invalid data URL format');
            }
            
            // Extract MIME type
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : chunk.mimeType || 'audio/webm';
            
            // Convert base64 to binary
            const binary = atob(parts[1]);
            
            // Create array buffer
            const arrayBuffer = new ArrayBuffer(binary.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            
            for (let i = 0; i < binary.length; i++) {
              uint8Array[i] = binary.charCodeAt(i);
            }
            
            // Create blob and URL
            const newBlob = new Blob([uint8Array], { type: mime });
            audioUrl = URL.createObjectURL(newBlob);
            console.log('Converted data URL to blob for playback:', { 
              size: newBlob.size, 
              type: newBlob.type 
            });
          } catch (error) {
            console.error('Error processing data URL:', error);
            resolve(false);
            return;
          }
        } else {
          console.error('Invalid audio data format:', typeof chunk.blob);
          resolve(false);
          return;
        }
        
        // Set source and start loading
        audio.src = audioUrl;
        audio.load();
        
        // Set timeout for overall operation
        setTimeout(() => {
          console.warn('Audio test timed out after 10 seconds');
          resolve(false);
        }, 10000);
      });
    } catch (error) {
      console.error('Error testing audio chunk:', error);
      return false;
    }
  };
  
  // Test audio and video synchronization
  const testAudioVideoSync = async () => {
    if (!videoPlayerRef.current || !audioRef.current) {
      console.error('Video or audio element not available for sync test');
      return false;
    }
    
    if (!recordedAudio) {
      console.error('No recorded audio available to test');
      return false;
    }
    
    setSyncTestResult(null);
    
    try {
      console.log('Starting audio-video synchronization test');
      
      // Reset both players
      videoPlayerRef.current.currentTime = 0;
      audioRef.current.currentTime = 0;
      
      // Set up recording and measurement variables
      const videoStartTime = Date.now();
      let audioStartTime = 0;
      let syncDifference = 0;
      
      // Create promise for detecting synchronization
      return new Promise<{success: boolean; details: string}>((resolve) => {
        // Set up audio event handlers
        const audioPlayHandler = () => {
          audioStartTime = Date.now();
          syncDifference = audioStartTime - videoStartTime;
          
          console.log('Audio playback started in sync test:', {
            videoStartTime,
            audioStartTime,
            syncDifference: `${syncDifference}ms`
          });
        };
        
        const audioEndHandler = () => {
          // Clean up event listeners
          audioRef.current?.removeEventListener('play', audioPlayHandler);
          audioRef.current?.removeEventListener('ended', audioEndHandler);
          
          // Calculate results
          const success = syncDifference < 500; // Less than 500ms difference is considered good
          
          console.log('Sync test completed:', {
            syncDifference: `${syncDifference}ms`,
            success,
            threshold: '500ms'
          });
          
          resolve({
            success,
            details: `Audio started ${syncDifference}ms after video. ${
              success ? 'Synchronization is good!' : 'Synchronization needs improvement.'
            }`
          });
        };
        
        // Add event listeners to the audio element
        if (audioRef.current) {
          audioRef.current.addEventListener('play', audioPlayHandler);
          audioRef.current.addEventListener('ended', audioEndHandler);
        } else {
          resolve({
            success: false,
            details: 'Audio element not available. Synchronization test aborted.'
          });
          return;
        }
        
        // Start playing the video, which should trigger the audio
        if (!videoPlayerRef.current) {
          // Clean up audio listeners first
          if (audioRef.current) {
            audioRef.current.removeEventListener('play', audioPlayHandler);
            audioRef.current.removeEventListener('ended', audioEndHandler);
          }
          
          resolve({
            success: false,
            details: 'Video element not available. Synchronization test aborted.'
          });
          return;
        }
        
        const videoPlayPromise = videoPlayerRef.current.play();
        
        videoPlayPromise.catch(error => {
          console.error('Video playback failed during sync test:', error);
          audioRef.current?.removeEventListener('play', audioPlayHandler);
          audioRef.current?.removeEventListener('ended', audioEndHandler);
          
          resolve({
            success: false,
            details: `Failed to play video: ${error.message}. Synchronization test aborted.`
          });
        });
        
        // Set timeout for overall operation
        setTimeout(() => {
          audioRef.current?.removeEventListener('play', audioPlayHandler);
          audioRef.current?.removeEventListener('ended', audioEndHandler);
          
          console.warn('Sync test timed out after 20 seconds');
          resolve({
            success: false,
            details: 'Synchronization test timed out. Check console for details.'
          });
        }, 20000);
      });
    } catch (error) {
      console.error('Error during sync test:', error);
      return {
        success: false,
        details: `Error during synchronization test: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordedAudio) {
        URL.revokeObjectURL(recordedAudio);
      }
      if (deserializedAudio) {
        URL.revokeObjectURL(deserializedAudio);
      }
    };
  }, [recordedAudio, deserializedAudio]);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
          &larr; Back to main app
        </Link>
        <h1 className="text-3xl font-bold mb-4">Audio Recording Test</h1>
        <p className="text-gray-600 mb-4">
          This page provides a standalone audio recorder to test recording and playback functionality.
        </p>
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-amber-700">
          <h3 className="font-bold">Dual Playback Test</h3>
          <p>This enhanced test compares direct audio playback with JSON-serialized playback (mimicking the main app).</p>
        </div>
      </div>
      
      {/* Video player section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Video Player</h2>
        <div className="flex items-center justify-between mb-3 bg-white p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            This video will synchronize with audio playback when testing recordings.
          </p>
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <span className="mr-2 text-sm">Sync with Audio:</span>
              <div 
                className={`relative inline-block w-10 h-6 transition-colors duration-200 ease-in-out rounded-full ${syncWithVideo ? 'bg-green-500' : 'bg-gray-300'}`}
                onClick={() => setSyncWithVideo(!syncWithVideo)}
              >
                <span 
                  className={`absolute left-1 top-1 bottom-1 w-4 h-4 transition-transform duration-200 ease-in-out bg-white rounded-full ${syncWithVideo ? 'transform translate-x-4' : ''}`}
                ></span>
              </div>
            </label>
          </div>
        </div>
        
        <VideoPlayer 
          setVideoRef={(ref) => {
            videoPlayerRef.current = ref;
            
            // Add our custom event listeners for sync
            if (ref) {
              ref.addEventListener('play', () => setVideoPlaying(true));
              ref.addEventListener('pause', () => setVideoPlaying(false));
            }
          }}
        />
        
        <div className="bg-white p-3 rounded-lg mt-2">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs text-gray-500">
              {videoPlaying ? (
                <span className="text-green-500 flex items-center">
                  <span className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse"></span> 
                  Video is playing
                </span>
              ) : (
                <span>Video is paused</span>
              )}
            </div>
            {syncWithVideo && (
              <div className="text-blue-500 font-medium text-xs">
                ✓ Audio synchronization is enabled
              </div>
            )}
          </div>
          
          {recordedAudio && (
            <div className="mt-2">
              <button
                onClick={async () => {
                  setSyncTestResult(null);
                  const result = await testAudioVideoSync();
                  if (result) {
                    setSyncTestResult(result);
                  }
                }}
                className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm py-1 px-3 rounded"
              >
                Test Audio-Video Sync
              </button>
              
              {syncTestResult && (
                <div className={`mt-2 p-2 text-xs rounded ${
                  syncTestResult.success ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {syncTestResult.success ? '✓ ' : '⚠ '}
                  {syncTestResult.details}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Audio Recorder</h2>
          <p className="text-sm text-gray-500 mb-4">
            Recording format: {recordingFormat || 'Not determined yet'}
          </p>
          
          <div className="flex items-center space-x-4 mb-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                <span className="h-3 w-3 bg-white rounded-full mr-2"></span>
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
              >
                <span className="h-3 w-3 bg-white mr-2"></span>
                Stop Recording
              </button>
            )}
            <span className="text-gray-500">
              {isRecording ? `Recording: ${formatTime(elapsedTime)}` : ''}
            </span>
          </div>
          
          {isRecording && (
            <div className="flex items-center mb-4">
              <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
              <span className="text-red-500">Microphone active</span>
            </div>
          )}
        </div>
        
        {recordedAudio && (
          <div className="border-t pt-4">
            <h2 className="text-xl font-semibold mb-4">Audio Playback Comparison</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Direct Playback */}
              <div className="bg-gray-100 p-4 rounded-md">
                <h3 className="font-semibold text-lg mb-2 text-blue-700">1. Direct Playback</h3>
                <p className="text-sm text-gray-500 mb-2">
                  Direct blob URL playback (known to work)
                </p>
                
                <audio 
                  ref={audioRef}
                  src={recordedAudio} 
                  controls 
                  className="w-full mb-3"
                />
                
                <div className="text-xs text-gray-600 mb-2">
                  Recording length: {formatTime(recordingDuration)}
                </div>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        
                        // If sync is enabled, start the video first
                        if (syncWithVideo && videoPlayerRef.current) {
                          // Reset the video to the beginning
                          videoPlayerRef.current.currentTime = 0;
                          
                          // Start playing the video
                          const playPromise = videoPlayerRef.current.play();
                          
                          // Video play is a promise that may be rejected (e.g., if user hasn't interacted with page)
                          playPromise.then(() => {
                            // Once video is playing, play the audio
                            audioRef.current?.play();
                            setVideoPlaying(true);
                          }).catch(err => {
                            console.warn('Video play failed, playing audio only:', err);
                            // Fall back to audio-only if video fails
                            audioRef.current?.play();
                          });
                        } else {
                          // Just play audio if sync is disabled
                          audioRef.current.play();
                        }
                      }
                    }}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Replay
                  </button>
                  
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = recordedAudio;
                      a.download = `audio-recording-${new Date().toISOString()}.webm`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    Download
                  </button>
                </div>
              </div>
              
              {/* Serialized Playback */}
              <div className="bg-gray-100 p-4 rounded-md">
                <h3 className="font-semibold text-lg mb-2 text-purple-700">2. Serialized Playback</h3>
                <p className="text-sm text-gray-500 mb-2">
                  JSON serialized and deserialized (mimics main app)
                </p>
                
                {deserializedAudio ? (
                  <audio 
                    ref={audioSerializedRef}
                    src={deserializedAudio} 
                    controls 
                    className="w-full mb-3"
                  />
                ) : (
                  <div className="w-full h-12 bg-gray-200 flex items-center justify-center text-gray-500 mb-3">
                    Waiting for deserialization...
                  </div>
                )}
                
                <div className="text-xs text-gray-600 mb-2">
                  Conversion: Blob → base64 → Blob → URL
                </div>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (audioSerializedRef.current) {
                        audioSerializedRef.current.currentTime = 0;
                        
                        // If sync is enabled, start the video first
                        if (syncWithVideo && videoPlayerRef.current) {
                          // Reset the video to the beginning
                          videoPlayerRef.current.currentTime = 0;
                          
                          // Start playing the video
                          const playPromise = videoPlayerRef.current.play();
                          
                          // Video play is a promise that may be rejected (e.g., if user hasn't interacted with page)
                          playPromise.then(() => {
                            // Once video is playing, play the audio
                            audioSerializedRef.current?.play();
                            setVideoPlaying(true);
                          }).catch(err => {
                            console.warn('Video play failed, playing audio only:', err);
                            // Fall back to audio-only if video fails
                            audioSerializedRef.current?.play();
                          });
                        } else {
                          // Just play audio if sync is disabled
                          audioSerializedRef.current.play();
                        }
                      }
                    }}
                    disabled={!deserializedAudio}
                    className={`px-3 py-1 text-white text-sm rounded ${deserializedAudio ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-400'}`}
                  >
                    Replay
                  </button>
                  
                  <button
                    onClick={async () => {
                      const jsonRepresentation = await createJsonRepresentation();
                      if (jsonRepresentation) {
                        const a = document.createElement('a');
                        const blob = new Blob([jsonRepresentation], { type: 'application/json' });
                        a.href = URL.createObjectURL(blob);
                        a.download = `audio-chunk-${new Date().toISOString()}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(a.href);
                      }
                    }}
                    disabled={!audioChunk}
                    className={`px-3 py-1 text-white text-sm rounded ${audioChunk ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-400'}`}
                  >
                    Export JSON
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!audioChunk) return;
                      
                      setPlaybackTestRunning(true);
                      setPlaybackTestResult(null);
                      
                      try {
                        const success = await testAudioChunkPlayback(audioChunk);
                        setPlaybackTestResult({
                          success,
                          details: success 
                            ? "Playback test completed successfully!" 
                            : "Playback test failed. Check console for details."
                        });
                      } catch (error) {
                        setPlaybackTestResult({
                          success: false,
                          details: `Test error: ${error instanceof Error ? error.message : String(error)}`
                        });
                      } finally {
                        setPlaybackTestRunning(false);
                      }
                    }}
                    disabled={!audioChunk || playbackTestRunning}
                    className={`px-3 py-1 text-white text-sm rounded ${
                      !audioChunk || playbackTestRunning 
                        ? 'bg-gray-400' 
                        : 'bg-yellow-500 hover:bg-yellow-600'
                    }`}
                  >
                    {playbackTestRunning ? 'Testing...' : 'Test Playback'}
                  </button>
                </div>
                
                {playbackTestResult && (
                  <div className={`mt-3 p-2 text-xs rounded ${
                    playbackTestResult.success 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    <strong>{playbackTestResult.success ? 'Success:' : 'Error:'}</strong> {playbackTestResult.details}
                  </div>
                )}
                
                {debugInfo.serializationError && (
                  <div className="mt-3 p-2 bg-red-100 text-red-700 text-xs rounded">
                    <strong>Error:</strong> {debugInfo.serializationError}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => {
                  setRecordedAudio(null);
                  setRecordedBlob(null);
                  setSerializedAudio(null);
                  setDeserializedAudio(null);
                  setAudioChunk(null);
                  setDebugInfo({});
                  chunksRef.current = [];
                }}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
        
        {/* Serialization Debug Information */}
        {Object.keys(debugInfo).length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="font-semibold text-lg mb-2">Debug Information</h3>
            
            <div className="bg-gray-800 text-green-300 p-4 rounded font-mono text-xs overflow-x-auto">
              <pre>
{`Audio Serialization Debug:
------------------------
Original Blob:
  Size: ${debugInfo.originalBlob?.size} bytes (${debugInfo.originalBlob?.size ? (debugInfo.originalBlob.size / 1024).toFixed(2) : '?'} KB)
  Type: ${debugInfo.originalBlob?.type}
  MIME: ${debugInfo.originalBlob?.mimeType}

Base64 Conversion:
  Length: ${debugInfo.base64String?.length} characters
  Time: ${debugInfo.base64String?.conversionTimeMs}ms
  Preview: ${debugInfo.base64String?.preview}

Deserialized Blob:
  Size: ${debugInfo.deserializedBlob?.size} bytes (${debugInfo.deserializedBlob?.size ? (debugInfo.deserializedBlob.size / 1024).toFixed(2) : '?'} KB)
  Type: ${debugInfo.deserializedBlob?.type}
  Time: ${debugInfo.deserializedBlob?.conversionTimeMs}ms

Comparison:
  Size Match: ${debugInfo.comparison?.sizeMatch ? '✅ Yes' : '❌ No'}
  Type Match: ${debugInfo.comparison?.typeMatch ? '✅ Yes' : '❌ No'}
  Size Difference: ${debugInfo.comparison?.diffBytes || 0} bytes
`}
              </pre>
            </div>
            
            {/* Add base64 string preview and download button */}
            {serializedAudio && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Base64 String (first 100 chars)</h4>
                <div className="bg-gray-100 p-3 rounded overflow-x-auto">
                  <code className="text-xs break-all">
                    {serializedAudio.substring(0, 100)}...
                  </code>
                </div>
                <button
                  onClick={() => {
                    if (serializedAudio) {
                      const a = document.createElement('a');
                      const blob = new Blob([serializedAudio], { type: 'text/plain' });
                      a.href = URL.createObjectURL(blob);
                      a.download = `audio-base64-${new Date().toISOString()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(a.href);
                    }
                  }}
                  className="mt-2 px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  Download Base64 String
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-8 border-t pt-4">
          <h3 className="font-semibold text-lg mb-2">Cross-Browser Compatibility</h3>
          
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <p className="text-sm text-blue-800 mb-2">
              This section helps diagnose audio recording and playback issues across different browsers.
              Below is a compatibility chart based on our testing.
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-blue-200 p-2">Browser</th>
                    <th className="border border-blue-200 p-2">Direct Recording</th>
                    <th className="border border-blue-200 p-2">Direct Playback</th>
                    <th className="border border-blue-200 p-2">Serialized Playback</th>
                    <th className="border border-blue-200 p-2">Preferred Format</th>
                    <th className="border border-blue-200 p-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-blue-200 p-2">Chrome (Desktop)</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2">audio/webm;codecs=opus</td>
                    <td className="border border-blue-200 p-2">Most reliable</td>
                  </tr>
                  <tr>
                    <td className="border border-blue-200 p-2">Firefox (Desktop)</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2">audio/webm</td>
                    <td className="border border-blue-200 p-2">Works well</td>
                  </tr>
                  <tr>
                    <td className="border border-blue-200 p-2">Safari (Desktop)</td>
                    <td className="border border-blue-200 p-2 text-yellow-600">⚠ Variable</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2 text-yellow-600">⚠ Variable</td>
                    <td className="border border-blue-200 p-2">audio/mp4</td>
                    <td className="border border-blue-200 p-2">May require explicit user interaction</td>
                  </tr>
                  <tr>
                    <td className="border border-blue-200 p-2">Chrome (Mobile)</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2">audio/webm;codecs=opus</td>
                    <td className="border border-blue-200 p-2">Touch interaction required</td>
                  </tr>
                  <tr>
                    <td className="border border-blue-200 p-2">Safari (iOS)</td>
                    <td className="border border-blue-200 p-2 text-yellow-600">⚠ Variable</td>
                    <td className="border border-blue-200 p-2 text-green-600">✓ Works</td>
                    <td className="border border-blue-200 p-2 text-yellow-600">⚠ Variable</td>
                    <td className="border border-blue-200 p-2">audio/mp4</td>
                    <td className="border border-blue-200 p-2">Requires explicit user interaction</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            <h4 className="font-semibold mb-1">Your Browser Information:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <BrowserInfo />
              </li>
              <li>
                <MimeTypesInfo />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}