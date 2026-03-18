'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { usePWAInstall } from './components/PWAInstallProvider'


export default function Login() {
  const router = useRouter()
  const { canInstall, isIOS, isStandalone, triggerInstall } = usePWAInstall()
  const [showIOSInstall, setShowIOSInstall] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  // Detect if iOS user is NOT in Safari (Chrome, Firefox, etc. can't install PWAs)
  const isIOSNotSafari = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (!isIOSDevice) return false
    // Check for non-Safari browsers on iOS
    return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  }, [])
  const [inviteEventName, setInviteEventName] = useState('')
  const [inviteHostName, setInviteHostName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Default to Sign Up mode when coming from an invite
  useEffect(() => {
    const eid = sessionStorage.getItem('evnt_invite_event_id')
    const ename = sessionStorage.getItem('evnt_invite_event_name')
    const hname = sessionStorage.getItem('evnt_invite_host_name')
    if (eid) {
      setIsSignUp(true)
      if (ename) setInviteEventName(ename)
      if (hname) setInviteHostName(hname)
    }
  }, [])

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) {
          if (signUpError.message?.includes('already registered')) {
            setIsSignUp(false)
            throw new Error('An account with this email already exists. Please sign in.')
          }
          throw signUpError
        }
        // Auto-login after signup to guarantee session is set
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        const { data: { user: confirmedUser } } = await supabase.auth.getUser()
        if (confirmedUser && fullName.trim()) {
          await supabase.from('profiles').upsert({ id: confirmedUser.id, full_name: fullName.trim() })
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      // Check if user came from an invite link — auto-join the event
      const pendingEventId = typeof window !== 'undefined' ? sessionStorage.getItem('evnt_invite_event_id') : null
      if (pendingEventId) {
        sessionStorage.removeItem('evnt_invite_event_id')
        sessionStorage.removeItem('evnt_invite_event_name')
        sessionStorage.removeItem('evnt_invite_redirect')
        sessionStorage.removeItem('evnt_invite_host_name')

        // Use the email from the form directly (getUser() can fail if email confirmation is required)
        const userEmail = email.trim().toLowerCase()
        if (userEmail) {
          // Check if already a member (pre-added by email invite)
          const { data: existing } = await supabase
            .from('event_members')
            .select('id')
            .eq('event_id', pendingEventId)
            .eq('user_email', userEmail)
            .maybeSingle()

          if (!existing) {
            await supabase.from('event_members').insert({
              event_id: pendingEventId,
              user_email: userEmail,
              role: 'Member',
              role_level: 'member',
            })
          }
        }
        router.push(`/event?id=${pendingEventId}`)
      } else {
        const redirect = typeof window !== 'undefined' ? sessionStorage.getItem('evnt_invite_redirect') : null
        if (redirect) {
          sessionStorage.removeItem('evnt_invite_redirect')
          router.push(redirect)
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      const message = err.message || 'Something went wrong'
      if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError(message)
      }
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#0A0A0A', color: '#F0F0F0',
      fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 20px'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 900, marginBottom: '8px' }}>
        Evnt<span style={{ color: '#FF4D00' }}>.Team</span>
      </h1>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
        Plan unforgettable experiences with your crew
      </p>

      {(canInstall || (isIOS && !isStandalone)) && (
        <button onClick={isIOS ? () => setShowIOSInstall(true) : triggerInstall} style={{
          background: 'rgba(255, 77, 0, 0.1)', border: '1px solid rgba(255, 77, 0, 0.3)',
          borderRadius: '12px', padding: '10px 24px', fontSize: '13px', fontWeight: 700,
          color: '#FF4D00', cursor: 'pointer', marginBottom: '28px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>📲</span> Install App
        </button>
      )}

      {!canInstall && !(isIOS && !isStandalone) && <div style={{ marginBottom: '20px' }} />}

      {showIOSInstall && (
        <div onClick={() => setShowIOSInstall(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#161616', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: '500px' }}>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#333', margin: '0 auto 24px' }} />
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📲</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#F0F0F0', marginBottom: '8px' }}>Install evnt.team</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Add to your home screen for the full app experience</div>
            </div>

            {isIOSNotSafari ? (
              <div style={{ background: '#0A0A0A', borderRadius: '14px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧭</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#F0F0F0', marginBottom: '8px' }}>Open in Safari first</div>
                <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.5' }}>
                  PWA installation only works in Safari on iOS. Copy the link below and paste it in Safari to install.
                </div>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href) }} style={{ marginTop: '14px', background: 'rgba(255,77,0,0.15)', border: '1px solid rgba(255,77,0,0.3)', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, color: '#FF4D00', cursor: 'pointer' }}>
                  Copy Link
                </button>
              </div>
            ) : (
              <div style={{ background: '#0A0A0A', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#FF4D00', flexShrink: 0 }}>1</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0F0' }}>Close this popup</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Then look for Safari's toolbar at the bottom of your screen</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#FF4D00', flexShrink: 0 }}>2</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0F0' }}>Tap the Share button <svg style={{ display: 'inline', verticalAlign: 'middle' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>The square icon with an arrow at the bottom of Safari</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#FF4D00', flexShrink: 0 }}>3</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0F0' }}>Scroll down & tap "Add to Home Screen"</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>You may need to scroll down in the share menu to find it</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#FF4D00', flexShrink: 0 }}>4</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0F0' }}>Tap "Add" in the top right</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>The app icon will appear on your home screen</div>
                  </div>
                </div>
              </div>
            )}

            {/* Visual pointer to Safari's toolbar */}
            {!isIOSNotSafari && (
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#555', fontWeight: 600 }}>Look for this icon in Safari's bottom toolbar</div>
                <div style={{ marginTop: '8px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </div>
                <div style={{ marginTop: '4px', fontSize: '20px', animation: 'bounce 1.5s infinite' }}>↓</div>
              </div>
            )}

            <button onClick={() => setShowIOSInstall(false)} style={{ width: '100%', background: '#FF4D00', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
              {isIOSNotSafari ? 'Got it' : 'Close & Follow Steps Above'}
            </button>

            <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }`}</style>
          </div>
        </div>
      )}

      <div style={{
        background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px',
        padding: '32px', width: '100%', maxWidth: '400px'
      }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: inviteEventName ? '12px' : '24px' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        {inviteEventName && (
          <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px', lineHeight: 1.4 }}>
            {inviteHostName
              ? <><span style={{ color: '#F0F0F0', fontWeight: 600 }}>{inviteHostName}</span> invited you to join </>
              : <>{isSignUp ? 'Sign up' : 'Sign in'} to join </>
            }
            <span style={{ color: '#FF4D00', fontWeight: 700 }}>{inviteEventName}</span>
          </p>
        )}

        {isSignUp && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jake Brooks"
              style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jake@gmail.com"
            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: '#FF4D00', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', background: loading ? '#333' : '#FF4D00', border: 'none',
            borderRadius: '12px', padding: '16px', fontSize: '16px',
            fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(255, 77, 0, 0.4)'
          }}>
          {loading ? 'Loading...' : isSignUp ? 'Create Account →' : 'Sign In →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#666' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#FF4D00', cursor: 'pointer', fontWeight: 600 }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </span>
        </p>
      </div>
    </main>
  )
}