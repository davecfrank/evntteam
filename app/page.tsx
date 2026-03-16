'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { usePWAInstall } from './components/PWAInstallProvider'


export default function Login() {
  const router = useRouter()
  const { canInstall, isIOS, isStandalone, triggerInstall } = usePWAInstall()
  const [showIOSInstall, setShowIOSInstall] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user && fullName.trim()) {
          await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName.trim() })
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      // Check if user came from an invite link
      const redirect = typeof window !== 'undefined' ? sessionStorage.getItem('evnt_invite_redirect') : null
      if (redirect) {
        sessionStorage.removeItem('evnt_invite_redirect')
        router.push(redirect)
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
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
            <div style={{ background: '#0A0A0A', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#FF4D00', flexShrink: 0 }}>1</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0F0' }}>Tap the Share button</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                    The <svg style={{ display: 'inline', verticalAlign: 'middle' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> icon at the bottom of Safari
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#FF4D00', flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#F0F0F0' }}>Tap "Add to Home Screen"</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Then tap "Add" in the top right</div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowIOSInstall(false)} style={{ width: '100%', background: '#FF4D00', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Got it</button>
          </div>
        </div>
      )}

      <div style={{
        background: '#161616', border: '1px solid #2A2A2A', borderRadius: '16px',
        padding: '32px', width: '100%', maxWidth: '400px'
      }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

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