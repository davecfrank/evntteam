'use client'
import { useState, useEffect } from 'react'

export default function PWAUpdateToast() {
  const [show, setShow] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setRegistration(e.detail.registration)
      setShow(true)
    }
    window.addEventListener('swUpdateAvailable', handler as EventListener)
    return () => window.removeEventListener('swUpdateAvailable', handler as EventListener)
  }, [])

  function handleRefresh() {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      background: '#161616', border: '1px solid #2A2A2A', borderRadius: '14px',
      padding: '14px 20px', zIndex: 10000,
      display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
      maxWidth: 'calc(100vw - 40px)',
    }}>
      <div style={{ fontSize: '14px', color: '#F0F0F0', fontWeight: 600 }}>
        A new version is available
      </div>
      <button onClick={handleRefresh} style={{
        background: '#FF4D00', border: 'none', borderRadius: '8px',
        padding: '8px 16px', color: '#fff', fontSize: '13px',
        fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>Refresh</button>
      <button onClick={() => setShow(false)} style={{
        background: 'none', border: 'none', color: '#666',
        fontSize: '18px', cursor: 'pointer', padding: '2px',
      }}>x</button>
    </div>
  )
}
