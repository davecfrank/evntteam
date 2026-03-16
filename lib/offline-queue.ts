const DB_NAME = 'evnt-offline'
const STORE_NAME = 'pending-actions'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export interface OfflineAction {
  id?: number
  url: string
  method: string
  body: any
  timestamp: number
}

export async function queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add({
      ...action,
      timestamp: Date.now(),
    })

    // Register background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready
      await (registration as any).sync.register('evnt-offline-actions')
    }
  } catch (err) {
    console.error('Failed to queue offline action:', err)
  }
}

export async function getQueuedActions(): Promise<OfflineAction[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return []
  }
}

export async function clearQueuedActions() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
  } catch {
    // Silently fail
  }
}

// Replay queued actions — called when coming back online
export async function replayQueuedActions() {
  const actions = await getQueuedActions()
  for (const action of actions) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      })
    } catch {
      // Still offline, stop trying
      break
    }
  }
  await clearQueuedActions()
}

// Auto-replay when browser comes back online (fallback for browsers without SyncManager)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    replayQueuedActions()
  })
}
