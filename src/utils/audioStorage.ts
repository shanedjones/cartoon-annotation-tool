/**
 * Client-side utilities for managing audio storage
 */

/**
 * Upload an audio blob to Azure Storage
 * @param audioBlob The audio blob to upload
 * @param sessionId The session ID to associate with the audio
 * @returns The URL of the uploaded blob
 */
export const uploadAudioToStorage = async (audioBlob: Blob, sessionId: string): Promise<string> => {
  try {
    if (!audioBlob || !(audioBlob instanceof Blob) || audioBlob.size === 0) {
      throw new Error('Invalid audio blob provided for upload');
    }
    
    console.log(`Preparing to upload audio blob: size=${audioBlob.size}, type=${audioBlob.type}`);
    
    const formData = new FormData();
    formData.append('audio', new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' }));
    formData.append('sessionId', sessionId);
    
    console.log('Sending audio blob to API endpoint');
    
    const response = await fetch('/api/audio', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Ignore JSON parsing errors and use statusText
      }
      throw new Error(`Failed to upload audio: ${errorMessage} (status: ${response.status})`);
    }
    
    const data = await response.json();
    
    if (!data.url) {
      throw new Error('No URL returned from audio upload API');
    }
    
    console.log('Successfully uploaded audio blob, received URL:', data.url);
    return data.url;
  } catch (error) {
    console.error('Error uploading audio to storage:', error);
    throw error;
  }
};

/**
 * Download an audio blob from a URL
 * @param url The URL of the audio blob to download
 * @returns The downloaded audio blob
 */
export const downloadAudioFromUrl = async (url: string): Promise<Blob> => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error downloading audio from URL:', error);
    throw error;
  }
};