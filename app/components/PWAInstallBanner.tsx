'use client'
import { useState, useEffect } from 'react'
import { usePWAInstall } from './PWAInstallProvider'

function IOSInstallTooltip({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem('evnt-ios-install-shown')) {
      onDismiss()
      return
    }
    setVisible(true)
    sessionStorage.setItem('evnt-ios-install-shown', '1')

    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, 10000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px',
      padding: '16px 20px', zIndex: 9999, maxWidth: 'calc(100vw - 40px)', width: '340px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
    }}>
      <button onClick={() => { setVisible(false); onDismiss() }} style={{
        position: 'absolute', top: '8px', right: '12px',
        background: 'none', border: 'none', color: '#666', fontSize: '18px', cursor: 'pointer',
      }}>x</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <span style={{ fontSize: '24px' }}>
          {/* iOS Share icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0F0' }}>
            Install evnt.team
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            Tap <strong style={{ color: '#FF4D00' }}>Share</strong> then <strong style={{ color: '#FF4D00' }}>"Add to Home Screen"</strong>
          </div>
        </div>
      </div>

      {/* Animated arrow pointing down to share icon area */}
      <div style={{
        textAlign: 'center', fontSize: '20px',
        animation: 'evnt-bounce 1s infinite',
      }}>
        <span style={{ color: '#FF4D00' }}>↓</span>
      </div>

      <style>{`
        @keyframes evnt-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
      `}</style>
    </div>
  )
}

export default function PWAInstallBanner() {
  const { showInstallBanner, isIOS, isStandalone, triggerInstall, dismissInstall } = usePWAInstall()

  if (!showInstallBanner || isStandalone) return null

  if (isIOS) {
    return <IOSInstallTooltip onDismiss={dismissInstall} />
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#161616', borderTop: '1px solid #2A2A2A',
      padding: '16px 20px', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0F0', marginBottom: '2px' }}>
          Add evnt.team to your home screen
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          For the best experience
        </div>
      </div>
      <button onClick={triggerInstall} style={{
        background: '#FF4D00', border: 'none', borderRadius: '10px',
        padding: '10px 20px', color: '#fff', fontSize: '13px',
        fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>Install</button>
      <button onClick={dismissInstall} style={{
        background: 'none', border: 'none', color: '#666',
        fontSize: '20px', cursor: 'pointer', padding: '4px',
      }}>x</button>
    </div>
  )
}
