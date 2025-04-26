'use client';

// Constants for the IndexedDB database
const DB_NAME = 'VideoCache';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';

// Interface for cached video metadata
interface VideoCacheItem {
  url: string;
  blobUrl: string;
  size: number;
  lastAccessed: number;
  mimeType: string;
}

// Type definition for cache entries to be stored in IndexedDB
type VideoCacheEntry = {
  url: string;
  blob: Blob;
  blobUrl?: string;
  lastAccessed: number;
};

// Max cache size in bytes (100MB)
const MAX_CACHE_SIZE = 100 * 1024 * 1024;

/**
 * Initialize the IndexedDB database for video caching
 */
function initializeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      
      reject(new Error('Failed to open video cache database'));
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create the videos object store with URL as the key path
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        const store = db.createObjectStore(VIDEO_STORE, { keyPath: 'url' });
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
  });
}

/**
 * Cache a video by URL, storing it in IndexedDB
 * @param url The URL of the video to cache
 * @returns Promise that resolves to a Blob URL for the cached video
 */
export async function cacheVideo(url: string): Promise<string> {
  try {
    // Check if already in cache
    const existingItem = await getFromCache(url);
    if (existingItem) {
      
      // Update last accessed time
      await updateLastAccessed(url);
      return existingItem.blobUrl;
    }
    
    // Check if it's likely a cross-origin URL before attempting fetch
    let isCrossOrigin = false;
    try {
      if (typeof window !== 'undefined') {
        const videoUrlObj = new URL(url, window.location.href);
        isCrossOrigin = videoUrlObj.origin !== window.location.origin;
      }
    } catch (e) {
      
    }
    
    // Error on cross-origin URLs to avoid CORS issues
    if (isCrossOrigin) {
      
      throw new Error('Cross-origin videos cannot be loaded. Please contact technical support.');
    }
    
    // For same-origin URLs, attempt to fetch
    
    try {
      // Try direct fetch
      const response = await fetch(url, { 
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Check if we need to make room in the cache
      await ensureCacheSpace(blob.size);
      
      // Store in IndexedDB
      await storeInCache({
        url,
        blob,
        blobUrl,
        lastAccessed: Date.now(),
      });
      
      
      return blobUrl;
    } catch (fetchError) {
      
      // Don't create a placeholder - throw the error to be handled by the caller
      throw new Error('Failed to fetch video. Please contact technical support.');
    }
  } catch (error) {
    
    // Rethrow the error to be handled by the caller
    throw error;
  }
}

/**
 * Get a video from the cache by URL
 * @param url The URL of the video to retrieve
 * @returns Promise that resolves to the cache item or null if not found
 */
export async function getFromCache(url: string): Promise<VideoCacheItem | null> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE], 'readonly');
      const store = transaction.objectStore(VIDEO_STORE);
      const request = store.get(url);
      
      request.onerror = () => {
        reject(new Error('Failed to retrieve video from cache'));
      };
      
      request.onsuccess = () => {
        const result = request.result as VideoCacheEntry | undefined;
        
        if (result) {
          resolve({
            url: result.url,
            blobUrl: result.blobUrl || URL.createObjectURL(result.blob),
            size: result.blob.size,
            lastAccessed: result.lastAccessed,
            mimeType: result.blob.type,
          });
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    
    return null;
  }
}

/**
 * Store a video in the cache
 * @param entry The cache entry to store
 */
async function storeInCache(entry: VideoCacheEntry): Promise<void> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE);
      const request = store.put(entry);
      
      request.onerror = () => {
        reject(new Error('Failed to store video in cache'));
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  } catch (error) {
    
    throw error;
  }
}

/**
 * Update the last accessed time for a cached video
 * @param url The URL of the video to update
 */
async function updateLastAccessed(url: string): Promise<void> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE);
      const request = store.get(url);
      
      request.onerror = () => {
        reject(new Error('Failed to retrieve video for updating last accessed time'));
      };
      
      request.onsuccess = () => {
        const result = request.result as VideoCacheEntry | undefined;
        
        if (result) {
          result.lastAccessed = Date.now();
          const updateRequest = store.put(result);
          
          updateRequest.onerror = () => {
            reject(new Error('Failed to update last accessed time'));
          };
          
          updateRequest.onsuccess = () => {
            resolve();
          };
        } else {
          resolve(); // Item not found, nothing to update
        }
      };
    });
  } catch (error) {
    
  }
}

/**
 * Get the total size of all cached videos
 * @returns Promise that resolves to the total size in bytes
 */
async function getCacheTotalSize(): Promise<number> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE], 'readonly');
      const store = transaction.objectStore(VIDEO_STORE);
      const request = store.getAll();
      
      request.onerror = () => {
        reject(new Error('Failed to retrieve cache contents'));
      };
      
      request.onsuccess = () => {
        const entries = request.result as VideoCacheEntry[];
        const totalSize = entries.reduce((total, entry) => total + (entry.blob?.size || 0), 0);
        resolve(totalSize);
      };
    });
  } catch (error) {
    
    return 0;
  }
}

/**
 * Ensure there's enough space in the cache for a new video
 * @param newItemSize The size of the new video in bytes
 */
async function ensureCacheSpace(newItemSize: number): Promise<void> {
  try {
    // Get current cache size
    const currentSize = await getCacheTotalSize();
    
    // Check if adding the new item would exceed the max cache size
    if (currentSize + newItemSize > MAX_CACHE_SIZE) {
      
      await removeOldestItems(currentSize + newItemSize - MAX_CACHE_SIZE);
    }
  } catch (error) {
    
  }
}

/**
 * Remove the oldest items from the cache until enough space is freed
 * @param bytesToFree The number of bytes to free
 */
async function removeOldestItems(bytesToFree: number): Promise<void> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE);
      const index = store.index('lastAccessed');
      const request = index.openCursor();
      
      let freedBytes = 0;
      
      request.onerror = () => {
        reject(new Error('Failed to open cursor for removing old items'));
      };
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor && freedBytes < bytesToFree) {
          const entry = cursor.value as VideoCacheEntry;
          freedBytes += entry.blob?.size || 0;
          
          // Revoke the blob URL to prevent memory leaks
          if (entry.blobUrl && entry.blobUrl !== entry.url) {
            // Only revoke if it's a blob URL, not the original URL
            URL.revokeObjectURL(entry.blobUrl);
          }
          
          const deleteRequest = cursor.delete();
          deleteRequest.onerror = () => {
            
          };
          
          cursor.continue();
        } else {
          
          resolve();
        }
      };
    });
  } catch (error) {
    
  }
}

/**
 * Clear all videos from the cache
 */
export async function clearVideoCache(): Promise<void> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE);
      
      // First get all entries to revoke blob URLs
      const getAllRequest = store.getAll();
      
      getAllRequest.onerror = () => {
        reject(new Error('Failed to retrieve cache entries for clearing'));
      };
      
      getAllRequest.onsuccess = () => {
        const entries = getAllRequest.result as VideoCacheEntry[];
        
        // Revoke all blob URLs to prevent memory leaks
        entries.forEach(entry => {
          if (entry.blobUrl && entry.blobUrl !== entry.url) {
            // Only revoke if it's a blob URL, not the original URL
            URL.revokeObjectURL(entry.blobUrl);
          }
        });
        
        // Clear the store
        const clearRequest = store.clear();
        
        clearRequest.onerror = () => {
          reject(new Error('Failed to clear video cache'));
        };
        
        clearRequest.onsuccess = () => {
          
          resolve();
        };
      };
    });
  } catch (error) {
    
  }
}

/**
 * Get cache statistics
 * @returns Promise that resolves to cache statistics
 */
export async function getVideoCacheStats(): Promise<{ count: number; totalSize: number }> {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE], 'readonly');
      const store = transaction.objectStore(VIDEO_STORE);
      const countRequest = store.count();
      
      countRequest.onerror = () => {
        reject(new Error('Failed to count cache entries'));
      };
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        
        // Get all entries to calculate total size
        const getAllRequest = store.getAll();
        
        getAllRequest.onerror = () => {
          reject(new Error('Failed to retrieve cache entries for stats'));
        };
        
        getAllRequest.onsuccess = () => {
          const entries = getAllRequest.result as VideoCacheEntry[];
          const totalSize = entries.reduce((total, entry) => total + (entry.blob?.size || 0), 0);
          
          resolve({
            count,
            totalSize,
          });
        };
      };
    });
  } catch (error) {
    
    return { count: 0, totalSize: 0 };
  }
}