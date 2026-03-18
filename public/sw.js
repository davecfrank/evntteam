const CACHE_VERSION = 'evnt-v2'
const STATIC_CACHE = 'evnt-static-v2'
const DYNAMIC_CACHE = 'evnt-dynamic-v2'

const APP_SHELL = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// ─── INSTALL ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

// ─── ACTIVATE ───────────────────────────────────────────
self.addEventListener('activate', event => {
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE]
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => !validCaches.includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

// ─── FETCH ──────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip chrome-extension, blob, etc.
  if (!url.protocol.startsWith('http')) return

  // API calls + Supabase → network-first
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(networkFirst(request))
    return
  }

  // Next.js static assets → network-first (ensures fresh JS on new deploys)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // Navigation requests → network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline.html'))
    )
    return
  }

  // Images, fonts, other assets → stale-while-revalidate
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Everything else → network-first
  event.respondWith(networkFirst(request))
})

// ─── CACHING STRATEGIES ─────────────────────────────────

async function networkFirst(request) {
  try {
    const response = await fetchWithTimeout(request, 3000)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('Offline', { status: 503 })
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, response.clone()))
      }
      return response
    })
    .catch(() => null)

  return cached || await fetchPromise || new Response('Offline', { status: 503 })
}

function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout)
    fetch(request).then(response => {
      clearTimeout(timer)
      resolve(response)
    }).catch(err => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

// ─── BACKGROUND SYNC ────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'evnt-offline-actions') {
    event.waitUntil(replayOfflineActions())
  }
})

async function replayOfflineActions() {
  try {
    const db = await openDB()
    const tx = db.transaction('pending-actions', 'readonly')
    const store = tx.objectStore('pending-actions')
    const actions = await getAllFromStore(store)

    for (const action of actions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.body),
        })
        // Remove successful action
        const deleteTx = db.transaction('pending-actions', 'readwrite')
        deleteTx.objectStore('pending-actions').delete(action.id)
      } catch {
        // Will retry on next sync
        break
      }
    }
  } catch {
    // IndexedDB not available
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('evnt-offline', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('pending-actions')) {
        db.createObjectStore('pending-actions', { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ─── PUSH NOTIFICATIONS ─────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}

  const title = data.title || 'evnt.team'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'evnt-notification',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Focus existing window if possible
        for (const client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise open new window
        return self.clients.openWindow(url)
      })
  )
})

// ─── MESSAGE HANDLER (for skip waiting) ─────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
