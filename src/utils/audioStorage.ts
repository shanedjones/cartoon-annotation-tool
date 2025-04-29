export const uploadAudioToStorage = async (audioBlob: Blob, sessionId: string): Promise<string> => {
  try {
    if (!audioBlob || !(audioBlob instanceof Blob) || audioBlob.size === 0) {
      throw new Error('Invalid audio blob provided for upload');
    }
    const formData = new FormData();
    formData.append('audio', new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' }));
    formData.append('sessionId', sessionId);
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
      }
      throw new Error(`Failed to upload audio: ${errorMessage} (status: ${response.status})`);
    }
    const data = await response.json();
    if (!data.url) {
      throw new Error('No URL returned from audio upload API');
    }
    return data.url;
  } catch (error) {
    throw error;
  }
};
export const downloadAudioFromUrl = async (url: string): Promise<Blob> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    throw error;
  }
};