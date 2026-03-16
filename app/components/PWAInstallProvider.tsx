'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface PWAInstallContextType {
  canInstall: boolean
  isIOS: boolean
  isStandalone: boolean
  showInstallBanner: boolean
  triggerInstall: () => Promise<void>
  dismissInstall: () => void
  signalHighIntent: () => void
}

const PWAInstallContext = createContext<PWAInstallContextType>({
  canInstall: false,
  isIOS: false,
  isStandalone: false,
  showInstallBanner: false,
  triggerInstall: async () => {},
  dismissInstall: () => {},
  signalHighIntent: () => {},
})

export const usePWAInstall = () => useContext(PWAInstallContext)

export default function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [highIntentSignaled, setHighIntentSignaled] = useState(false)

  useEffect(() => {
    // Detect iOS Safari
    const ua = navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isIOSDevice)

    // Detect standalone mode (already installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Capture beforeinstallprompt for Chrome/Android
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Show banner when high intent + installable + not recently dismissed
  useEffect(() => {
    if (!highIntentSignaled) return
    if (isStandalone) return

    const dismissedAt = localStorage.getItem('evnt-pwa-dismissed')
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSince < 30) return
    }

    if (deferredPrompt || isIOS) {
      setShowInstallBanner(true)
    }
  }, [highIntentSignaled, deferredPrompt, isIOS, isStandalone])

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallBanner(false)
    }
  }, [deferredPrompt])

  const dismissInstall = useCallback(() => {
    setShowInstallBanner(false)
    localStorage.setItem('evnt-pwa-dismissed', Date.now().toString())
  }, [])

  const signalHighIntent = useCallback(() => {
    setHighIntentSignaled(true)
  }, [])

  return (
    <PWAInstallContext.Provider value={{
      canInstall: !!deferredPrompt,
      isIOS,
      isStandalone,
      showInstallBanner,
      triggerInstall,
      dismissInstall,
      signalHighIntent,
    }}>
      {children}
    </PWAInstallContext.Provider>
  )
}
