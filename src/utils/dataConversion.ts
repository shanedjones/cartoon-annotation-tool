import type { AudioChunk } from '../types/media';
import type { DrawingPath } from '../types/annotation';
import type { FeedbackSession, TimelineEvent } from '../types/timeline';
import { v4 as uuidv4 } from 'uuid';

/**
 * Format category name from camelCase to readable format
 */
export const getCategoryLabel = (category: string): string => {
  return category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
};

/**
 * Get a playable audio URL from an AudioChunk
 */
export const getAudioUrl = (chunk: AudioChunk): string => {
  // Use Azure Storage URL if available
  if (chunk.blobUrl) {
    return chunk.blobUrl;
  }
  
  // Create blob URL for playback if it's a blob
  if (chunk.blob instanceof Blob) {
    return URL.createObjectURL(chunk.blob);
  }
  
  // If it's a data URL string, it can be used directly
  if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
    return chunk.blob;
  }
  
  // Error case - log and return empty string
  console.error('Invalid audio chunk format: No playable audio source');
  return '';
};

/**
 * Simplified function to prepare a session for storage
 * This replaces the legacy prepareAudioChunksForSave function
 */
export const prepareSessionForStorage = async (session: FeedbackSession): Promise<FeedbackSession> => {
  // Make a deep copy to avoid modifying the original
  const sessionCopy = JSON.parse(JSON.stringify(session)) as FeedbackSession;
  
  // Handle audio chunks for storage
  if (sessionCopy.audioTrack && sessionCopy.audioTrack.chunks) {
    for (let i = 0; i < sessionCopy.audioTrack.chunks.length; i++) {
      const chunk = sessionCopy.audioTrack.chunks[i];
      
      // If we have a blob URL from Azure, keep it and remove the blob
      if (chunk.blobUrl) {
        sessionCopy.audioTrack.chunks[i] = {
          ...chunk,
          blob: null // Don't store the blob
        };
      }
      // If we have a Blob, try to upload it to Azure Storage
      else if (chunk.blob instanceof Blob) {
        try {
          // Upload to Azure Storage
          const { uploadAudioToStorage } = await import('../utils/audioStorage');
          const blobUrl = await uploadAudioToStorage(chunk.blob, sessionCopy.id);
          
          // Update the chunk with the new URL
          sessionCopy.audioTrack.chunks[i] = {
            ...chunk,
            blobUrl,
            blob: null // Don't store the blob
          };
        } catch (error) {
          console.error('Failed to upload audio to Azure Storage:', error);
          
          // Convert the blob to a data URL as fallback
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(chunk.blob as Blob);
          });
          
          // Store as data URL
          sessionCopy.audioTrack.chunks[i] = {
            ...chunk,
            blob: dataUrl,
            mimeType: chunk.mimeType || (chunk.blob as Blob).type
          };
        }
      }
      // If already a data URL, leave it alone
      else if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
        // Keep as is
      }
      // Any other format, convert to an empty placeholder
      else {
        console.warn(`Unknown blob format in chunk ${i}: ${typeof chunk.blob}`);
        sessionCopy.audioTrack.chunks[i] = {
          ...chunk,
          blob: null,
          blobUrl: chunk.blobUrl || null,
        };
      }
    }
  }
  
  return sessionCopy;
};

/**
 * Simplified function to restore audio chunks when loading saved data
 * This replaces the legacy restoreAudioChunks function
 */
export const restoreAudioChunksInSession = (session: FeedbackSession): FeedbackSession => {
  // Make a deep copy to avoid modifying the original
  const sessionCopy = JSON.parse(JSON.stringify(session)) as FeedbackSession;
  
  // Process audio chunks
  if (sessionCopy.audioTrack && sessionCopy.audioTrack.chunks) {
    sessionCopy.audioTrack.chunks = sessionCopy.audioTrack.chunks.map((chunk, index) => {
      try {
        // If we have a blob URL, we can just use that directly
        if (chunk.blobUrl) {
          return {
            ...chunk,
            blob: null, // Clear any blob data to avoid duplication
          };
        }
        // If blob is already a Blob object, keep it
        else if (chunk.blob instanceof Blob) {
          return chunk;
        }
        // If blob is a string (data URL), convert to Blob for better playback
        else if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
          try {
            // Extract mime type from data URL if possible
            const mimeMatch = chunk.blob.match(/^data:(.*?)(;base64)?/);
            const mimeType = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : (chunk.mimeType || 'audio/webm');
            
            // Only convert to blob for actual playback; can be deferred
            return {
              ...chunk,
              // Keep as data URL for now, will be converted when needed
              mimeType
            };
          } catch (error) {
            console.warn(`Error processing data URL in chunk ${index}:`, error);
            return chunk;
          }
        }
        // Any other format, return as is
        return chunk;
      } catch (error) {
        console.error(`Error restoring audio chunk ${index}:`, error);
        return chunk;
      }
    });
  }
  
  return sessionCopy;
};

/**
 * Convert a data URL to a Blob for playback
 */
export const dataURLToBlob = (dataURL: string): Blob => {
  try {
    // Basic validation
    if (!dataURL || !dataURL.startsWith('data:')) {
      throw new Error('Invalid data URL format');
    }
    
    // Split the data URL into parts - header and payload
    const parts = dataURL.split(',');
    if (parts.length !== 2) {
      throw new Error('Invalid data URL format - wrong number of parts');
    }
    
    // Extract MIME type
    const headerPart = parts[0];
    let mime = 'audio/webm'; // Default fallback
    
    const mimeMatch = headerPart.match(/^data:(.*?)(;base64)?$/);
    if (mimeMatch && mimeMatch[1]) {
      mime = mimeMatch[1];
    }
    
    // Get base64 data
    const base64Data = parts[1];
    
    // Convert base64 to binary
    const binary = atob(base64Data);
    
    // Create array buffer
    const arrayBuffer = new ArrayBuffer(binary.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Fill array buffer with binary data
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    
    // Create and return blob
    return new Blob([uint8Array], { type: mime });
  } catch (error) {
    console.error('Error converting data URL to Blob:', error);
    return new Blob([], { type: 'audio/webm' });
  }
};