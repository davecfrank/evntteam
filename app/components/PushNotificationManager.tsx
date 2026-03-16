'use client'
import { useEffect, useCallback } from 'react'

// VAPID public key — generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

async function ensureSubscription() {
  try {
    if (!VAPID_PUBLIC_KEY) return
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    if (subscription) {
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
    }
  } catch (err) {
    console.error('Push subscription failed:', err)
  }
}

export default function PushNotificationManager() {
  const checkSubscription = useCallback(() => {
    if (!('PushManager' in window)) return
    if (!('serviceWorker' in navigator)) return
    if (Notification.permission === 'granted') {
      ensureSubscription()
    }
  }, [])

  useEffect(() => {
    // Check subscription if permission already granted
    checkSubscription()
  }, [checkSubscription])

  return null
}

// Export helper for requesting push permission from high-intent moments
export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') {
    await ensureSubscription()
    return true
  }
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  if (result === 'granted') {
    await ensureSubscription()
    return true
  }
  return false
}
