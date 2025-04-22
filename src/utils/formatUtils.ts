/**
 * Format time helper function (mm:ss)
 * Converts seconds to a formatted time string
 */
export function formatTime(time: number): string {
  if (!time || isNaN(time) || time < 0) {
    return '0:00';
  }
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Format file size helper (bytes to KB, MB, GB)
 * Converts bytes to a human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration (HH:MM:SS)
 * Converts seconds to hours, minutes, seconds format
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) {
    return '00:00:00';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Format timestamp from ISO string to readable date
 */
export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch (e) {
    return 'Invalid date';
  }
}