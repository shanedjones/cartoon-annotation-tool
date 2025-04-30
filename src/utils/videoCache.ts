'use client';
const DB_NAME = 'VideoCache';
const DB_VERSION = 1;
const VIDEO_STORE = 'videos';
interface VideoCacheItem {
  url: string;
  blobUrl: string;
  size: number;
  lastAccessed: number;
  mimeType: string;
}
type VideoCacheEntry = {
  url: string;
  blob: Blob;
  blobUrl?: string;
  lastAccessed: number;
};
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB maximum cache size
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
export async function cacheVideo(url: string): Promise<string> {
  try {
    const existingItem = await getFromCache(url);
    if (existingItem) {
      await updateLastAccessed(url);
      return existingItem.blobUrl;
    }
    let isCrossOrigin = false;
    try {
      if (typeof window !== 'undefined') {
        const videoUrlObj = new URL(url, window.location.href);
        isCrossOrigin = videoUrlObj.origin !== window.location.origin;
      }
    } catch (e) {
    }
    if (isCrossOrigin) {
      throw new Error('Cross-origin videos cannot be loaded. Please contact technical support.');
    }
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'same-origin'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      await ensureCacheSpace(blob.size);
      await storeInCache({
        url,
        blob,
        blobUrl,
        lastAccessed: Date.now(),
      });
      return blobUrl;
    } catch (fetchError) {
      throw new Error('Failed to fetch video. Please contact technical support.');
    }
  } catch (error) {
    throw error;
  }
}
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
          resolve();
        }
      };
    });
  } catch (error) {
  }
}
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
async function ensureCacheSpace(newItemSize: number): Promise<void> {
  try {
    const currentSize = await getCacheTotalSize();
    if (currentSize + newItemSize > MAX_CACHE_SIZE) {
      await removeOldestItems(currentSize + newItemSize - MAX_CACHE_SIZE);
    }
  } catch (error) {
  }
}
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
          if (entry.blobUrl && entry.blobUrl !== entry.url) {
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
export async function clearVideoCache(): Promise<void> {
  try {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE);
      const getAllRequest = store.getAll();
      getAllRequest.onerror = () => {
        reject(new Error('Failed to retrieve cache entries for clearing'));
      };
      getAllRequest.onsuccess = () => {
        const entries = getAllRequest.result as VideoCacheEntry[];
        entries.forEach(entry => {
          if (entry.blobUrl && entry.blobUrl !== entry.url) {
            URL.revokeObjectURL(entry.blobUrl);
          }
        });
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