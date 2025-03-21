'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

// Define minimal audio chunk interface
interface AudioChunk {
  blob: Blob | string;
  mimeType?: string;
}

// Client-only component for browser info
const BrowserInfo = () => {
  const [userAgent, setUserAgent] = useState('Loading...');
  
  useEffect(() => {
    setUserAgent(navigator.userAgent);
  }, []);
  
  return <span>Browser: {userAgent}</span>;
};

// Minimal serialization test page
export default function SerializationTestPage() {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingFormat, setRecordingFormat] = useState('');
  
  // Serialization state
  const [serializedString, setSerializedString] = useState<string | null>(null);
  const [deserializedBlob, setDeserializedBlob] = useState<Blob | null>(null);
  const [deserializedAudioUrl, setDeserializedAudioUrl] = useState<string | null>(null);
  
  // Original audio URL (direct from recorder)
  const [directAudioUrl, setDirectAudioUrl] = useState<string | null>(null);
  
  // Debug information
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const directAudioRef = useRef<HTMLAudioElement | null>(null);
  const deserializedAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Helper function to convert blob to base64
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
  
  // Helper function to convert base64 back to blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    try {
      const byteString = atob(base64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      return new Blob([ab], { type: mimeType });
    } catch (error) {
      console.error('Error converting base64 to Blob:', error);
      throw error;
    }
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      // Reset state
      chunksRef.current = [];
      setRecordedBlob(null);
      setDirectAudioUrl(null);
      setSerializedString(null);
      setDeserializedBlob(null);
      setDeserializedAudioUrl(null);
      setDebugInfo({});
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
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
      console.log('Using audio format:', mimeType || 'default');
      
      // Create recorder
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
        try {
          // Create audio blob from chunks
          const audioBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          setRecordedBlob(audioBlob);
          
          // Create direct URL for immediate playback
          const directUrl = URL.createObjectURL(audioBlob);
          setDirectAudioUrl(directUrl);
          
          // Log original blob info
          console.log('Original audio blob:', {
            type: audioBlob.type,
            size: audioBlob.size,
            chunks: chunksRef.current.length
          });
          
          // Start serialization process
          await serializeAndDeserialize(audioBlob, mimeType || 'audio/webm');
          
          // Stop all tracks to release the microphone
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          setError(`Error processing recording: ${err instanceof Error ? err.message : String(err)}`);
          console.error('Recording processing error:', err);
        }
      };
      
      // Start the recorder
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setError(`Could not start recording: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error starting recording:', error);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Serialize and deserialize audio blob
  const serializeAndDeserialize = async (blob: Blob, mimeType: string) => {
    try {
      // Step 1: Convert blob to base64 string
      console.log('Step 1: Converting blob to base64...');
      const startTime1 = performance.now();
      const base64String = await blobToBase64(blob);
      const endTime1 = performance.now();
      
      // Set serialized string state
      setSerializedString(base64String);
      console.log('Base64 conversion complete:', {
        originalSize: blob.size,
        base64Length: base64String.length,
        timeMs: (endTime1 - startTime1).toFixed(2)
      });
      
      // Step 2: Convert base64 back to blob
      console.log('Step 2: Converting base64 back to blob...');
      const startTime2 = performance.now();
      const newBlob = base64ToBlob(base64String, mimeType);
      const endTime2 = performance.now();
      
      // Set deserialized blob state
      setDeserializedBlob(newBlob);
      console.log('Blob conversion complete:', {
        newSize: newBlob.size, 
        newType: newBlob.type,
        timeMs: (endTime2 - startTime2).toFixed(2)
      });
      
      // Step 3: Create audio URL from new blob
      const deserializedUrl = URL.createObjectURL(newBlob);
      setDeserializedAudioUrl(deserializedUrl);
      
      // Set debug info for display
      setDebugInfo({
        originalBlob: {
          size: blob.size,
          type: blob.type,
          mimeType: mimeType
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
          typeMatch: blob.type === newBlob.type
        }
      });
    } catch (error) {
      setError(`Serialization error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Serialization process failed:', error);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (directAudioUrl) URL.revokeObjectURL(directAudioUrl);
      if (deserializedAudioUrl) URL.revokeObjectURL(deserializedAudioUrl);
    };
  }, [directAudioUrl, deserializedAudioUrl]);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
          &larr; Back to main app
        </Link>
        <h1 className="text-3xl font-bold mb-4">Audio Serialization Test</h1>
        <p className="text-gray-600 mb-4">
          This minimal test focuses only on recording audio and testing the serialization/deserialization process.
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        {/* Recording controls */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">1. Record Audio</h2>
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
          </div>
          
          {isRecording && (
            <div className="flex items-center mb-4">
              <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse mr-2"></span>
              <span className="text-red-500">Microphone active</span>
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-6 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {/* Audio playback comparison */}
        {directAudioUrl && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">2. Playback Comparison</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Direct playback */}
              <div className="bg-gray-100 p-4 rounded-md">
                <h3 className="font-semibold text-lg mb-2 text-blue-700">Direct Playback</h3>
                <p className="text-sm text-gray-500 mb-2">
                  Original recording (no serialization)
                </p>
                
                <audio 
                  ref={directAudioRef}
                  src={directAudioUrl} 
                  controls 
                  className="w-full mb-3"
                />
                
                <div className="text-xs text-gray-600 mb-2">
                  Size: {recordedBlob ? `${(recordedBlob.size / 1024).toFixed(2)} KB` : 'Unknown'}
                </div>
                
                <button
                  onClick={() => {
                    if (directAudioRef.current) {
                      directAudioRef.current.currentTime = 0;
                      directAudioRef.current.play();
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Replay
                </button>
              </div>
              
              {/* Serialized playback */}
              <div className="bg-gray-100 p-4 rounded-md">
                <h3 className="font-semibold text-lg mb-2 text-purple-700">Deserialized Playback</h3>
                <p className="text-sm text-gray-500 mb-2">
                  After base64 conversion and back
                </p>
                
                {deserializedAudioUrl ? (
                  <audio 
                    ref={deserializedAudioRef}
                    src={deserializedAudioUrl} 
                    controls 
                    className="w-full mb-3"
                  />
                ) : (
                  <div className="w-full h-12 bg-gray-200 flex items-center justify-center text-gray-500 mb-3">
                    Waiting for deserialization...
                  </div>
                )}
                
                <div className="text-xs text-gray-600 mb-2">
                  Size: {deserializedBlob ? `${(deserializedBlob.size / 1024).toFixed(2)} KB` : 'Unknown'}
                </div>
                
                <button
                  onClick={() => {
                    if (deserializedAudioRef.current) {
                      deserializedAudioRef.current.currentTime = 0;
                      deserializedAudioRef.current.play();
                    }
                  }}
                  disabled={!deserializedAudioUrl}
                  className={`px-3 py-1 text-white text-sm rounded ${deserializedAudioUrl ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-400'}`}
                >
                  Replay
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Serialization details */}
        {Object.keys(debugInfo).length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="font-semibold text-lg mb-2">3. Serialization Details</h3>
            
            <div className="bg-gray-800 text-green-300 p-4 rounded font-mono text-xs overflow-x-auto">
              <pre>
{`Serialization Process:
------------------------
Original Blob:
  Size: ${debugInfo.originalBlob?.size} bytes (${(debugInfo.originalBlob?.size / 1024).toFixed(2)} KB)
  Type: ${debugInfo.originalBlob?.type}
  MIME: ${debugInfo.originalBlob?.mimeType}

Base64 Conversion:
  Length: ${debugInfo.base64String?.length} characters
  Time: ${debugInfo.base64String?.conversionTimeMs}ms
  Preview: ${debugInfo.base64String?.preview}

Deserialized Blob:
  Size: ${debugInfo.deserializedBlob?.size} bytes (${(debugInfo.deserializedBlob?.size / 1024).toFixed(2)} KB)
  Type: ${debugInfo.deserializedBlob?.type}
  Time: ${debugInfo.deserializedBlob?.conversionTimeMs}ms

Comparison:
  Size Match: ${debugInfo.comparison?.sizeMatch ? '✅ Yes' : '❌ No'}
  Type Match: ${debugInfo.comparison?.typeMatch ? '✅ Yes' : '❌ No'}
`}
              </pre>
            </div>
            
            {/* Base64 string preview */}
            {serializedString && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Base64 String (first 100 chars)</h4>
                <div className="bg-gray-100 p-3 rounded overflow-x-auto">
                  <code className="text-xs break-all">
                    {serializedString.substring(0, 100)}...
                  </code>
                </div>
                <button
                  onClick={() => {
                    if (serializedString) {
                      const a = document.createElement('a');
                      const blob = new Blob([serializedString], { type: 'text/plain' });
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
      </div>
      
      <div className="text-xs text-gray-500 mt-4">
        <BrowserInfo />
      </div>
    </div>
  );
}