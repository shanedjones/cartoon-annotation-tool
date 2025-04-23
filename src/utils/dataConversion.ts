import type { AudioChunk } from '../components/AudioRecorder';
import type { DrawingPath } from '../components/AnnotationCanvas';
import type { RecordedAction, FeedbackData } from '../components/VideoPlayer';
import type { FeedbackSession, AudioTrack, TimelineEvent } from '../components/FeedbackOrchestrator';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper function to convert Blob to base64 for storage
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
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

/**
 * Format category name from camelCase to readable format
 */
export const getCategoryLabel = (category: string): string => {
  return category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
};

/**
 * Enhanced helper function to convert base64 back to Blob for playback
 */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  try {
    // Validate input parameters
    if (!base64 || typeof base64 !== 'string') {
      console.error('Invalid base64 input: not a string or empty', typeof base64);
      throw new Error('Invalid base64 input: not a string or empty');
    }
    
    if (!mimeType || typeof mimeType !== 'string') {
      console.warn('Invalid or missing MIME type, using default: audio/webm');
      mimeType = 'audio/webm'; // Fallback to default
    }
    
    // First ensure we have a proper data URL with the correct format
    if (!base64.startsWith('data:')) {
      console.error('Invalid base64 string format - missing data: prefix');
      console.debug('String starts with:', base64.substring(0, Math.min(20, base64.length)));
      throw new Error('Invalid base64 string format - missing data: prefix');
    }
    
    if (!base64.includes(',')) {
      console.error('Invalid base64 string format - missing comma separator');
      throw new Error('Invalid base64 string format - missing comma separator');
    }
    
    // Extract the base64 part after the comma
    const base64Data = base64.split(',')[1];
    if (!base64Data) {
      console.error('Invalid base64 string - no data after comma');
      throw new Error('Invalid base64 string - no data after comma');
    }
    
    // Get actual MIME type from the data URL if present
    const headerPart = base64.split(',')[0];
    const mimeMatch = headerPart.match(/^data:(.*?)(;base64)?$/);
    if (mimeMatch && mimeMatch[1]) {
      // If the data URL contains a MIME type, use it instead of the provided mimeType
      console.log(`Using MIME type from data URL (${mimeMatch[1]}) instead of provided type (${mimeType})`);
      mimeType = mimeMatch[1];
    }
    
    try {
      // Decode the base64 string to binary with error handling
      const byteString = atob(base64Data);
      
      // Create an ArrayBuffer to hold the decoded data
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      // Copy the decoded binary data to the array buffer
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      // Create and return a new Blob from the array buffer
      const blob = new Blob([ab], { type: mimeType });
      
      // Validate created blob
      if (blob.size === 0) {
        console.warn('Created an empty blob from base64 data, possible data corruption');
      } else {
        console.log(`Successfully converted base64 to Blob: size=${blob.size}, type=${blob.type}`);
      }
      
      return blob;
    } catch (binaryError) {
      console.error('Error processing binary data:', binaryError);
      throw new Error(`Failed to process binary data: ${binaryError instanceof Error ? binaryError.message : String(binaryError)}`);
    }
  } catch (error) {
    console.error('Error converting base64 to Blob:', error);
    throw error;
  }
};

/**
 * Helper function to prepare audio chunks for saving to JSON
 */
export const prepareAudioChunksForSave = async (chunks: AudioChunk[]): Promise<any[]> => {
  if (!chunks || chunks.length === 0) {
    console.log('No audio chunks to prepare for save');
    return [];
  }
  
  console.log(`Preparing ${chunks.length} audio chunks for save...`);
  
  // Create a deep copy of the chunks
  return Promise.all(chunks.map(async (chunk, index) => {
    try {
      console.log(`Processing chunk ${index} for save, blob type:`, 
        chunk.blob instanceof Blob ? 'Blob object' : typeof chunk.blob);
      
      // Only convert if it's a Blob and not already a string
      if (chunk.blob instanceof Blob) {
        console.log(`Chunk ${index}: Converting Blob to base64, size: ${chunk.blob.size}, type: ${chunk.blob.type}`);
        
        // Convert Blob to base64 string for storage
        const base64 = await blobToBase64(chunk.blob);
        
        // Log length of base64 string for debugging
        console.log(`Chunk ${index}: Base64 conversion complete, string length: ${base64.length}`);
        
        // Save with MIME type and other properties
        return {
          ...chunk,
          blob: base64, // Replace Blob with base64 string
          mimeType: chunk.mimeType || chunk.blob.type, // Ensure we save the mime type
          url: undefined, // Remove URL property if it exists
          blobUrl: chunk.blobUrl // Keep the Azure Storage blob URL if it exists
        };
      } else if (typeof chunk.blob === 'string' && chunk.blob.startsWith('data:')) {
        // Already a data URL, verify it's properly formatted
        console.log(`Chunk ${index}: Already a data URL, length: ${chunk.blob.length}`);
        
        // Verify data URL format
        const parts = chunk.blob.split(',');
        if (parts.length !== 2) {
          console.warn(`Chunk ${index}: Invalid data URL format - wrong number of parts`);
        }
        
        // Return as is, but ensure all properties are set
        return {
          ...chunk,
          mimeType: chunk.mimeType || 'audio/webm', // Ensure MIME type is set
          url: undefined, // Remove URL property if it exists
          blobUrl: chunk.blobUrl // Keep the Azure Storage blob URL if it exists
        };
      } else {
        console.warn(`Chunk ${index}: Unknown blob format: ${typeof chunk.blob}`);
        
        // Return with minimal valid properties
        return {
          ...chunk,
          blob: typeof chunk.blob === 'string' ? chunk.blob : '', // Keep string or use empty string
          mimeType: chunk.mimeType || 'audio/webm', // Ensure MIME type is set
          url: undefined, // Remove URL property if it exists
          blobUrl: chunk.blobUrl // Keep the Azure Storage blob URL if it exists
        };
      }
    } catch (error) {
      console.error(`Error converting audio chunk ${index} for storage:`, error);
      return null;
    }
  })).then(results => {
    const validResults = results.filter(Boolean); // Remove any failed conversions
    console.log(`Successfully prepared ${validResults.length} of ${chunks.length} audio chunks for save`);
    return validResults;
  });
};

/**
 * Helper function to restore audio chunks when loading saved data
 */
export const restoreAudioChunks = (savedChunks: any[]): AudioChunk[] => {
  if (!savedChunks || savedChunks.length === 0) {
    console.log('No audio chunks to restore');
    return [];
  }
  
  console.log(`Restoring ${savedChunks.length} audio chunks...`);
  
  return savedChunks.map((savedChunk, index) => {
    try {
      // If blob is already a Blob object, just return the chunk as is
      if (savedChunk.blob instanceof Blob) {
        console.log(`Chunk ${index}: Already a Blob object`);
        return savedChunk;
      }
      
      // If blob is a string (data URL), validate and keep as a string for compatibility
      if (typeof savedChunk.blob === 'string') {
        if (savedChunk.blob.startsWith('data:')) {
          console.log(`Chunk ${index}: Found data URL, keeping as string for AudioRecorder component`);
          
          // Try to validate the data URL format
          try {
            const dataUrlParts = savedChunk.blob.split(',');
            if (dataUrlParts.length !== 2) {
              console.warn(`Chunk ${index}: Invalid data URL format - wrong number of parts`);
            }
            // Check if the mime type part is valid
            const mimeMatch = dataUrlParts[0].match(/:(.*?);/);
            if (!mimeMatch) {
              console.warn(`Chunk ${index}: Data URL has no valid MIME type`);
            }
          } catch (validationError) {
            console.warn(`Chunk ${index}: Error validating data URL:`, validationError);
          }
          
          // Ensure all required properties are present
          return {
            ...savedChunk,
            blob: savedChunk.blob, // Keep the data URL as is
            mimeType: savedChunk.mimeType || 'audio/webm', // Set default MIME type if missing
            startTime: savedChunk.startTime || 0,
            duration: savedChunk.duration || 0,
            videoTime: savedChunk.videoTime || 0,
            blobUrl: savedChunk.blobUrl // Keep the Azure Storage blob URL if it exists
          };
        } else {
          console.warn(`Chunk ${index}: String blob doesn't start with 'data:' prefix: ${savedChunk.blob.substring(0, 20)}...`);
        }
      }
      
      console.warn(`Unknown blob format in chunk ${index}:`, typeof savedChunk.blob);
      // Log more details to aid debugging
      if (typeof savedChunk.blob === 'string') {
        console.info(`Chunk ${index} string length: ${savedChunk.blob.length}, starts with: ${savedChunk.blob.substring(0, 30)}...`);
      } else if (savedChunk.blob === null) {
        console.warn(`Chunk ${index}: Blob is null`);
      } else if (savedChunk.blob === undefined) {
        console.warn(`Chunk ${index}: Blob is undefined`);
      }
      
      // Return a simplified chunk as a fallback (audio won't play but won't crash either)
      return {
        ...savedChunk,
        blob: savedChunk.blob || '', // Keep as is even if invalid
        mimeType: savedChunk.mimeType || 'audio/webm',
        startTime: savedChunk.startTime || 0,
        duration: savedChunk.duration || 0,
        videoTime: savedChunk.videoTime || 0,
        blobUrl: savedChunk.blobUrl // Keep the Azure Storage blob URL if it exists
      };
    } catch (error) {
      console.error(`Error restoring audio chunk ${index}:`, error);
      return null;
    }
  }).filter(Boolean as any); // Remove any failed conversions
};

/**
 * Convert the legacy FeedbackData to the new FeedbackSession format
 */
export const convertLegacyDataToSession = (legacyData: FeedbackData): FeedbackSession => {
  // Create a new FeedbackSession from the legacy data
  const audioTrack: AudioTrack = {
    chunks: legacyData.audioChunks || [],
    totalDuration: legacyData.audioChunks?.reduce((total, chunk) => total + chunk.duration, 0) || 0
  };
  
  // Convert actions to timeline events
  const events: TimelineEvent[] = legacyData.actions.map(action => {
    return {
      id: uuidv4(),
      type: action.type === 'annotation' ? 'annotation' : 'video',
      timeOffset: action.timestamp,
      duration: action.type === 'audio' ? action.details?.duration : undefined,
      payload: 
        action.type === 'annotation' 
          ? { action: action.details?.clear ? 'clear' : 'draw', path: action.details?.path } 
          : { action: action.type, ...action.details }
    };
  });
  
  return {
    id: legacyData.sessionId || uuidv4(),
    videoId: legacyData.videoId,
    startTime: legacyData.startTime,
    endTime: legacyData.endTime,
    audioTrack,
    events
  };
};

/**
 * Convert FeedbackSession to legacy FeedbackData format for compatibility
 */
export const convertSessionToLegacyData = (session: FeedbackSession): FeedbackData => {
  // Create a new FeedbackData object
  const legacyData: FeedbackData = {
    sessionId: session.id,
    videoId: session.videoId,
    startTime: session.startTime,
    endTime: session.endTime,
    actions: [],
    audioChunks: session.audioTrack.chunks,
    annotations: []
  };
  
  // Collect all annotation paths
  const annotations: DrawingPath[] = [];
  
  // Convert timeline events to legacy actions
  session.events.forEach(event => {
    if (event.type === 'video') {
      const action: RecordedAction = {
        type: event.payload.action,
        timestamp: event.timeOffset,
        videoTime: 0, // Will need proper conversion
        details: { ...event.payload }
      };
      
      if (action.details) {
        delete action.details.action;
      }
      legacyData.actions.push(action);
    } 
    else if (event.type === 'annotation') {
      const action: RecordedAction = {
        type: 'annotation',
        timestamp: event.timeOffset,
        videoTime: 0, // Will need proper conversion
        details: event.payload.action === 'clear' 
          ? { clear: true } 
          : { path: event.payload.path }
      };
      legacyData.actions.push(action);
      
      // Also collect annotation paths for backwards compatibility
      if (event.payload.action === 'draw' && event.payload.path) {
        // Add timing metadata to the annotation for proper replay
        const pathWithTiming = {
          ...event.payload.path,
          timeOffset: event.timeOffset,
          globalTimeOffset: event.timeOffset,
          videoTime: event.timeOffset,
          tool: event.payload.path.tool || 'freehand' // Ensure tool type is preserved
        };
        annotations.push(pathWithTiming);
      }
    }
    else if (event.type === 'marker') {
      // Skip markers, as they don't have a direct equivalent in the legacy format
      console.log('Skipping marker event in legacy conversion:', event.payload.text);
    }
  });
  
  // Add annotations
  legacyData.annotations = annotations;
  
  return legacyData;
};