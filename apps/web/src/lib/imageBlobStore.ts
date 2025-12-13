/**
 * Image Blob Store - Separate IndexedDB storage for image blobs
 *
 * This module provides a dedicated storage for image blobs, keeping them
 * separate from the main flowStore to:
 * 1. Reduce memory pressure (blobs aren't loaded into Zustand state)
 * 2. Store raw Blob instead of base64 (33% smaller)
 * 3. Enable LRU-style cleanup when exceeding storage limits
 */

import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'zenith-image-blobs'
const DB_VERSION = 1
const BLOBS_STORE = 'blobs'
const META_STORE = 'meta'

// Storage limits - optimized for 2K/4K images
export const STORAGE_LIMITS = {
  MAX_IMAGES: 500,              // Maximum image count
  MAX_STORAGE_MB: 4096,         // Maximum storage: 4GB
  WARNING_THRESHOLD_PERCENT: 80, // Warn at 80%
}

interface BlobMeta {
  id: string
  size: number
  createdAt: number
  lastAccessedAt: number
}

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for actual blobs
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE)
      }
      // Store for metadata (size, timestamps for LRU)
      if (!db.objectStoreNames.contains(META_STORE)) {
        const metaStore = db.createObjectStore(META_STORE, { keyPath: 'id' })
        metaStore.createIndex('lastAccessedAt', 'lastAccessedAt')
        metaStore.createIndex('createdAt', 'createdAt')
      }
    },
  })

  return dbInstance
}

/**
 * Check if storage needs cleanup before storing a new blob
 * Returns cleanup info if needed, null if storage is OK
 */
export async function checkStorageLimit(newBlobSize: number): Promise<{
  needsCleanup: boolean
  reason: 'count' | 'size' | null
  currentCount: number
  currentSizeMB: number
} | null> {
  const count = await getBlobCount()
  const totalSize = await getTotalStorageSize()
  const totalSizeMB = Math.round((totalSize / 1024 / 1024) * 10) / 10
  const maxStorageBytes = STORAGE_LIMITS.MAX_STORAGE_MB * 1024 * 1024

  if (count >= STORAGE_LIMITS.MAX_IMAGES) {
    return {
      needsCleanup: true,
      reason: 'count',
      currentCount: count,
      currentSizeMB: totalSizeMB,
    }
  }

  if (totalSize + newBlobSize > maxStorageBytes) {
    return {
      needsCleanup: true,
      reason: 'size',
      currentCount: count,
      currentSizeMB: totalSizeMB,
    }
  }

  return null
}

/**
 * Cleanup oldest blobs to make room for new one
 * Call this after user confirms cleanup
 */
export async function cleanupForNewBlob(newBlobSize: number): Promise<boolean> {
  try {
    const maxStorageBytes = STORAGE_LIMITS.MAX_STORAGE_MB * 1024 * 1024
    let count = await getBlobCount()
    let totalSize = await getTotalStorageSize()

    // Remove oldest blobs until we have room
    while (count >= STORAGE_LIMITS.MAX_IMAGES || totalSize + newBlobSize > maxStorageBytes) {
      const removed = await removeOldestBlob()
      if (!removed) break
      count = await getBlobCount()
      totalSize = await getTotalStorageSize()
    }

    return true
  } catch (e) {
    console.error('Failed to cleanup blobs:', e)
    return false
  }
}

/**
 * Store a blob with the given ID (without auto-cleanup)
 * Returns the blob ID if successful, null if failed
 */
export async function storeBlob(id: string, blob: Blob): Promise<string | null> {
  try {
    const db = await getDB()

    // Store the blob
    await db.put(BLOBS_STORE, blob, id)

    // Store metadata
    const meta: BlobMeta = {
      id,
      size: blob.size,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    }
    await db.put(META_STORE, meta)

    return id
  } catch (e) {
    console.error('Failed to store blob:', e)
    return null
  }
}

/**
 * Store a blob with auto-cleanup (for backward compatibility)
 * Returns the blob ID if successful, 'cleanup_needed' if user confirmation required
 */
export async function storeBlobWithCleanup(id: string, blob: Blob): Promise<string | 'cleanup_needed' | null> {
  const limitCheck = await checkStorageLimit(blob.size)

  if (limitCheck?.needsCleanup) {
    return 'cleanup_needed'
  }

  return storeBlob(id, blob)
}

/**
 * Retrieve a blob by ID
 * Updates lastAccessedAt for LRU tracking
 */
export async function getBlob(id: string): Promise<Blob | null> {
  try {
    const db = await getDB()
    const blob = await db.get(BLOBS_STORE, id)

    if (blob) {
      // Update last accessed time
      const meta = await db.get(META_STORE, id)
      if (meta) {
        meta.lastAccessedAt = Date.now()
        await db.put(META_STORE, meta)
      }
    }

    return blob || null
  } catch (e) {
    console.error('Failed to get blob:', e)
    return null
  }
}

/**
 * Delete a blob by ID
 */
export async function deleteBlob(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete(BLOBS_STORE, id)
    await db.delete(META_STORE, id)
  } catch (e) {
    console.error('Failed to delete blob:', e)
  }
}

/**
 * Delete multiple blobs by IDs
 */
export async function deleteBlobs(ids: string[]): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction([BLOBS_STORE, META_STORE], 'readwrite')

    for (const id of ids) {
      tx.objectStore(BLOBS_STORE).delete(id)
      tx.objectStore(META_STORE).delete(id)
    }

    await tx.done
  } catch (e) {
    console.error('Failed to delete blobs:', e)
  }
}

/**
 * Get the count of stored blobs
 */
export async function getBlobCount(): Promise<number> {
  try {
    const db = await getDB()
    return await db.count(META_STORE)
  } catch (e) {
    console.error('Failed to get blob count:', e)
    return 0
  }
}

/**
 * Get total storage size in bytes
 */
export async function getTotalStorageSize(): Promise<number> {
  try {
    const db = await getDB()
    const allMeta = await db.getAll(META_STORE)
    return allMeta.reduce((sum, meta) => sum + meta.size, 0)
  } catch (e) {
    console.error('Failed to get total storage size:', e)
    return 0
  }
}

/**
 * Get storage info for UI display
 */
export async function getStorageInfo(): Promise<{
  count: number
  totalSizeMB: number
  maxImages: number
  maxStorageMB: number
  isNearLimit: boolean
}> {
  const count = await getBlobCount()
  const totalSize = await getTotalStorageSize()
  const totalSizeMB = Math.round((totalSize / 1024 / 1024) * 10) / 10

  const countPercent = (count / STORAGE_LIMITS.MAX_IMAGES) * 100
  const sizePercent = (totalSizeMB / STORAGE_LIMITS.MAX_STORAGE_MB) * 100

  return {
    count,
    totalSizeMB,
    maxImages: STORAGE_LIMITS.MAX_IMAGES,
    maxStorageMB: STORAGE_LIMITS.MAX_STORAGE_MB,
    isNearLimit: countPercent >= STORAGE_LIMITS.WARNING_THRESHOLD_PERCENT ||
                 sizePercent >= STORAGE_LIMITS.WARNING_THRESHOLD_PERCENT,
  }
}

/**
 * Remove the oldest accessed blob (LRU eviction)
 * Returns true if a blob was removed, false otherwise
 */
async function removeOldestBlob(): Promise<boolean> {
  try {
    const db = await getDB()
    const tx = db.transaction(META_STORE, 'readonly')
    const index = tx.store.index('lastAccessedAt')

    // Get the oldest accessed blob
    const cursor = await index.openCursor()
    if (cursor) {
      const oldestId = cursor.value.id
      await deleteBlob(oldestId)
      console.log(`Removed oldest blob: ${oldestId}`)
      return true
    }
    return false
  } catch (e) {
    console.error('Failed to remove oldest blob:', e)
    return false
  }
}

/**
 * Clear all blobs (used when user clears all data)
 */
export async function clearAllBlobs(): Promise<void> {
  try {
    const db = await getDB()
    await db.clear(BLOBS_STORE)
    await db.clear(META_STORE)
  } catch (e) {
    console.error('Failed to clear all blobs:', e)
  }
}

/**
 * Convert URL to Blob using proxy for external URLs
 */
export async function urlToBlob(url: string): Promise<Blob> {
  const apiUrl = import.meta.env.VITE_API_URL || ''
  const isExternal = url.startsWith('http') && !url.includes(window.location.host)
  const fetchUrl = isExternal ? `${apiUrl}/api/proxy-image?url=${encodeURIComponent(url)}` : url

  const response = await fetch(fetchUrl)
  return await response.blob()
}

/**
 * Get blob as object URL (for img src)
 * Remember to revoke when done!
 */
export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * Get blob as data URL (for download)
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
