/**
 * Convert a blob to a base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Error reading blob data'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a base64 string to a blob
 */
export function base64ToBlob(base64: string, mimeType: string = ''): Blob {
  // Extract the mime type from the data URL if one wasn't provided
  let resolvedMimeType = mimeType;
  if (!resolvedMimeType && base64.startsWith('data:')) {
    const matches = base64.match(/^data:([^;]+);base64,/);
    if (matches && matches.length > 1) {
      resolvedMimeType = matches[1];
    }
  }
  
  // Remove the data URL prefix if present
  const base64Data = base64.includes('base64,') 
    ? base64.split('base64,')[1] 
    : base64;
  
  // Decode the base64 string
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: resolvedMimeType });
}

/**
 * Create a temporary URL for a blob object
 */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke a blob URL to free up resources
 */
export function revokeBlobUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Extract MIME type from a URL or data URL
 */
export function getMimeTypeFromUrl(url: string): string | null {
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:([^;]+);/);
    if (matches && matches.length > 1) {
      return matches[1];
    }
    return null;
  }
  
  // Try to deduce from file extension
  const extension = url.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  
  const mimeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
  };
  
  return mimeMap[extension] || null;
}