'use client'
import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').then(registration => {
      // Check for updates every 60 minutes
      setInterval(() => registration.update(), 60 * 60 * 1000)

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker waiting — dispatch event for update toast
            window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
              detail: { registration }
            }))
          }
        })
      })
    }).catch(err => {
      console.error('Service worker registration failed:', err)
    })
  }, [])

  return null
}
